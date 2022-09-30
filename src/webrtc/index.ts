import { hashMini } from '../utils/crypto'
import { count, HTMLNote, modal } from '../utils/html'

export async function getWebRTCDevices(): Promise<MediaDeviceKind[] | null> {
	if (!navigator?.mediaDevices?.enumerateDevices) return null
	return navigator.mediaDevices.enumerateDevices().then((devices) => {
		return devices.map((device) => device.kind).sort()
	})
}

const getMediaConfig = (codec, video, audio) => ({
	type: 'file',
	video: !/^video/.test(codec) ? undefined : {
		contentType: codec,
		...video,
	},
	audio: !/^audio/.test(codec) ? undefined : {
		contentType: codec,
		...audio,
	},
})

export const getMediaCapabilities = async () => {
	const video = {
		width: 1920,
		height: 1080,
		bitrate: 120000,
		framerate: 60,
	}

	const audio = {
		channels: 2,
		bitrate: 300000,
		samplerate: 5200,
	}

	const codecs = [
		'audio/ogg; codecs=vorbis',
		'audio/ogg; codecs=flac',
		'audio/mp4; codecs="mp4a.40.2"',
		'audio/mpeg; codecs="mp3"',
		'video/ogg; codecs="theora"',
		'video/mp4; codecs="avc1.42E01E"',
	]

	const decodingInfo = codecs.map((codec) => {
		const config = getMediaConfig(codec, video, audio)
		// @ts-ignore
		return navigator.mediaCapabilities.decodingInfo(config).then((support) => ({
			codec,
			...support,
		}))
		.catch((error) => console.error(codec, error))
	})

	const capabilities = await Promise.all(decodingInfo).then((data) => {
		return data.reduce((acc, support) => {
			const { codec, supported, smooth, powerEfficient } = support || {}
			if (!supported) return acc
			return {
				...acc,
				[''+codec]: [
					...(smooth ? ['smooth'] : []),
					...(powerEfficient ? ['efficient'] : []),
				],
			}
		}, {})
	}).catch((error) => console.error(error))

	return capabilities
}

const getExtensions = (sdp) => {
	const extensions = (('' + sdp).match(/extmap:\d+ [^\n|\r]+/g) || [])
		.map((x) => x.replace(/extmap:[^\s]+ /, ''))
	return [...new Set(extensions)].sort()
}

const createCounter = () => {
	let counter = 0
	return {
		increment: () => counter += 1,
		getValue: () => counter,
	}
}

// https://webrtchacks.com/sdp-anatomy/
// https://tools.ietf.org/id/draft-ietf-rtcweb-sdp-08.html
const constructDescriptions = ({mediaType, sdp, sdpDescriptors, rtxCounter}) => {
	if (!(''+sdpDescriptors)) {
		return
	}
	return sdpDescriptors.reduce((descriptionAcc, descriptor) => {
		const matcher = `(rtpmap|fmtp|rtcp-fb):${descriptor} (.+)`
		const formats = (sdp.match(new RegExp(matcher, 'g')) || [])
		if (!(''+formats)) {
			return descriptionAcc
		}
		const isRtxCodec = ('' + formats).includes(' rtx/')
		if (isRtxCodec) {
			if (rtxCounter.getValue()) {
				return descriptionAcc
			}
			rtxCounter.increment()
		}
		const getLineData = (x) => x.replace(/[^\s]+ /, '')
		const description = formats.reduce((acc, x) => {
			const rawData = getLineData(x)
			const data = rawData.split('/')
			const codec = data[0]
			const description = {}

			if (x.includes('rtpmap')) {
				if (mediaType == 'audio') {
					description.channels = (+data[2]) || 1
				}
				description.mimeType = `${mediaType}/${codec}`
				description.clockRates = [+data[1]]
				return {
					...acc,
					...description,
				}
			} else if (x.includes('rtcp-fb')) {
				return {
					...acc,
					feedbackSupport: [...(acc.feedbackSupport||[]), rawData],
				}
			} else if (isRtxCodec) {
				return acc // no sdpFmtpLine
			}
			return { ...acc, sdpFmtpLine: [...rawData.split(';')] }
		}, {})

		let shouldMerge = false
		const mergerAcc = descriptionAcc.map((x) => {
			shouldMerge = x.mimeType == description.mimeType
			if (shouldMerge) {
				if (x.feedbackSupport) {
					x.feedbackSupport = [
						...new Set([...x.feedbackSupport, ...description.feedbackSupport]),
					]
				}
				if (x.sdpFmtpLine) {
					x.sdpFmtpLine = [
						...new Set([...x.sdpFmtpLine, ...description.sdpFmtpLine]),
					]
				}
				return {
					...x,
					clockRates: [
						...new Set([...x.clockRates, ...description.clockRates]),
					],
				}
			}
			return x
		})
		if (shouldMerge) {
			return mergerAcc
		}
		return [...descriptionAcc, description]
	}, [])
}

const getCapabilities = (sdp) => {
	const videoDescriptors = ((/m=video [^\s]+ [^\s]+ ([^\n|\r]+)/.exec(sdp) || [])[1] || '').split(' ')
	const audioDescriptors = ((/m=audio [^\s]+ [^\s]+ ([^\n|\r]+)/.exec(sdp) || [])[1] || '').split(' ')
	const rtxCounter = createCounter()
	return {
		audio: constructDescriptions({
			mediaType: 'audio',
			sdp,
			sdpDescriptors: audioDescriptors,
			rtxCounter,
		}),
		video: constructDescriptions({
			mediaType: 'video',
			sdp,
			sdpDescriptors: videoDescriptors,
			rtxCounter,
		}),
	}
}

const getIPAddress = (sdp) => {
	const blocked = '0.0.0.0'
	const candidateEncoding = /((udp|tcp)\s)((\d|\w)+\s)((\d|\w|(\.|\:))+)(?=\s)/ig
	const connectionLineEncoding = /(c=IN\s)(.+)\s/ig
	const connectionLineIpAddress = ((sdp.match(connectionLineEncoding) || [])[0] || '').trim().split(' ')[2]
	if (connectionLineIpAddress && (connectionLineIpAddress != blocked)) {
		return connectionLineIpAddress
	}
	const candidateIpAddress = ((sdp.match(candidateEncoding) || [])[0] || '').split(' ')[2]
	return candidateIpAddress && (candidateIpAddress != blocked) ? candidateIpAddress : undefined
}

export default async function getWebRTCData() {
	return new Promise(async (resolve) => {
		if (!window.RTCPeerConnection) {
			return resolve(null)
		}

		const config = {
			iceCandidatePoolSize: 1,
			iceServers: [
				{
					urls: [
						'stun:stun4.l.google.com:19302?transport=udp',
						'stun:stun3.l.google.com:19302?transport=udp',
						// 'stun:stun2.l.google.com:19302?transport=udp',
						// 'stun:stun1.l.google.com:19302?transport=udp',
						// 'stun:stun.l.google.com:19302?transport=udp',
					],
				},
			],
		}

		const connection = new RTCPeerConnection(config)
		connection.createDataChannel('')

		const options = { offerToReceiveAudio: 1, offerToReceiveVideo: 1 }
		// @ts-ignore
		const offer = await connection.createOffer(options)

		connection.setLocalDescription(offer)
		const { sdp } = offer || {}

		const extensions = getExtensions(sdp)
		const codecsSdp = getCapabilities(sdp)

		let iceCandidate = ''
		let foundation = ''
		const giveUpOnIPAddress = setTimeout(() => {
			connection.removeEventListener('icecandidate', computeCandidate)
			connection.close()
			if (sdp) {
				return resolve({
					codecsSdp,
					extensions,
					foundation,
					iceCandidate,
				})
			}
			return resolve(null)
		}, 3000)

		const computeCandidate = (event) => {
			const { candidate, foundation: foundationProp } = event.candidate || {}

			if (!candidate) {
				return
			}

			if (!iceCandidate) {
				iceCandidate = candidate
				foundation = (/^candidate:([\w]+)/.exec(candidate) || [])[1] || ''
			}

			const { sdp } = connection.localDescription || {}
			const address = getIPAddress(sdp)
			if (!address) {
				return
			}

			const knownInterface: Record<string, string> = {
				842163049: 'public interface',
				2268587630: 'WireGuard',
			}

			connection.removeEventListener('icecandidate', computeCandidate)
			clearTimeout(giveUpOnIPAddress)
			connection.close()
			return resolve({
				codecsSdp,
				extensions,
				foundation: knownInterface[foundation] || foundation,
				foundationProp,
				iceCandidate,
				address,
				stunConnection: candidate,
			})
		}

		connection.addEventListener('icecandidate', computeCandidate)
	})
}

export function webrtcHTML(webRTC, mediaDevices) {
	if (!webRTC && !mediaDevices) {
		return `
			<div class="col-six">
				<strong>WebRTC</strong>
				<div>host connection:</div>
				<div class="block-text">${HTMLNote.BLOCKED}</div>
				<div>foundation/ip:</div>
				<div class="block-text">${HTMLNote.BLOCKED}</div>
			</div>
			<div class="col-six">
				<div>sdp capabilities: ${HTMLNote.BLOCKED}</div>
				<div>stun connection:</div>
				<div class="block-text">${HTMLNote.BLOCKED}</div>
				<div>devices (0): ${HTMLNote.BLOCKED}</div>
				<div class="block-text">${HTMLNote.BLOCKED}</div>
			</div>
		`
	}
	const {
		codecsSdp,
		extensions,
		foundation,
		foundationProp,
		iceCandidate,
		address,
		stunConnection,
	} = webRTC || {}
	const { audio, video } = codecsSdp || {}
	const id = 'creep-webrtc'

	const webRTCHash = hashMini({
		codecsSdp,
		extensions,
		foundation,
		foundationProp,
		address,
		mediaDevices,
	})

	const deviceMap = {
		'audioinput': 'mic',
		'audiooutput': 'audio',
		'videoinput': 'webcam',
	}

	const feedbackId = {
		'ccm fir': 'Codec Control Message Full Intra Request (ccm fir)',
		'goog-remb': 'Google\'s Receiver Estimated Maximum Bitrate (goog-remb)',
		'nack': 'Negative ACKs (nack)',
		'nack pli': 'Picture loss Indication and NACK (nack pli)',
		'transport-cc': 'Transport Wide Congestion Control (transport-cc)',
	}

	const replaceIndex = ({ list, index, replacement }) => [
		...list.slice(0, index),
		replacement,
		...list.slice(index + 1),
	]

	const mediaDevicesByType = (mediaDevices || []).reduce((acc, x) => {
		const deviceType = deviceMap[x] || x
		if (!acc.includes(deviceType)) {
			return (acc = [...acc, deviceType])
		} else if (!deviceType.includes('dual') && (acc.filter((x) => x == deviceType) || []).length == 1) {
			return (
				acc = replaceIndex({
					list: acc,
					index: acc.indexOf(deviceType),
					replacement: `dual ${deviceType}`,
				})
			)
		}
		return (acc = [...acc, deviceType])
	}, [])

	const getModalTemplate = (list) => (list || []).map((x) => {
		return `
			<strong>${x.mimeType}</strong>
			<br>Clock Rates: ${x.clockRates.sort((a, b) => b - a).join(', ')}
			${x.channels > 1 ? `<br>Channels: ${x.channels}` : ''}
			${x.sdpFmtpLine ? `<br>Format Specific Parameters:<br>- ${x.sdpFmtpLine.sort().map((x) => x.replace('=', ': ')).join('<br>- ')}` : ''}
			${x.feedbackSupport ? `<br>Feedback Support:<br>- ${x.feedbackSupport.map((x) => {
				return feedbackId[x] || x
			}).sort().join('<br>- ')}` : ''}
		`
	}).join('<br><br>')

	return `
	<div class="relative col-six">
		<strong>WebRTC</strong><span class="hash">${webRTCHash}</span>
		<div>host connection:</div>
		<div class="block-text unblurred">${iceCandidate || HTMLNote.BLOCKED}</div>
		<div>foundation/ip:</div>
		<div class="block-text unblurred">
			<div>${foundation ? `type & base ip: ${foundation}` : HTMLNote.UNSUPPORTED}</div>
			<div>${address ? `ip: ${address}` : HTMLNote.BLOCKED}</div>
		</div>
	</div>
	<div class="relative col-six">
		<div class="help" title="RTCSessionDescription.sdp">sdp capabilities: ${
		!codecsSdp ? HTMLNote.BLOCKED :
			modal(
				`${id}-sdp-capabilities`,
				getModalTemplate(audio)+
				'<br><br>'+getModalTemplate(video)+
				'<br><br><strong>extensions</strong><br>'+extensions.join('<br>'),
				hashMini({ audio, video, extensions }),
			)
		}</div>
		<div>stun connection:</div>
		<div class="block-text unblurred">${stunConnection || HTMLNote.BLOCKED}</div>
		<div class="help" title="MediaDevices.enumerateDevices()\nMediaDeviceInfo.kind">devices (${count(mediaDevices)}):</div>
		<div class="block-text unblurred">${
				!mediaDevices || !mediaDevices.length ? HTMLNote.BLOCKED :
					mediaDevicesByType.join(', ')
			}
		</div>
	</div>
	`
}
