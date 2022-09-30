import { captureError } from '../errors'
import { lieProps, PHANTOM_DARKNESS, documentLie } from '../lies'
import { instanceId, hashMini } from '../utils/crypto'
import { createTimer, queueEvent, EMOJIS, CSS_FONT_FAMILY, IS_BLINK, IS_GECKO, logTestResult, performanceLogger, hashSlice, formatEmojiSet } from '../utils/helpers'
import { patch, html, HTMLNote, getDiffs } from '../utils/html'

function getRectSum(rect: Record<string, number>): number {
	return Object.keys(rect).reduce((acc, key) => acc += rect[key], 0)/100_000_000
}

// inspired by
// https://privacycheck.sec.lrz.de/active/fp_gcr/fp_getclientrects.html
// https://privacycheck.sec.lrz.de/active/fp_e/fp_emoji.html
export default async function getClientRects() {
	try {
		const timer = createTimer()
		await queueEvent(timer)
		const toNativeObject = (domRect: DOMRect): Record<string, number> => {
			return {
				bottom: domRect.bottom,
				height: domRect.height,
				left: domRect.left,
				right: domRect.right,
				width: domRect.width,
				top: domRect.top,
				x: domRect.x,
				y: domRect.y,
			}
		}
		let lied = (
			lieProps['Element.getClientRects'] ||
			lieProps['Element.getBoundingClientRect'] ||
			lieProps['Range.getClientRects'] ||
			lieProps['Range.getBoundingClientRect'] ||
			lieProps['String.fromCodePoint']
		) || false

		const DOC = (
			PHANTOM_DARKNESS &&
			PHANTOM_DARKNESS.document &&
			PHANTOM_DARKNESS.document.body ? PHANTOM_DARKNESS.document :
				document
		)

		const getBestRect = (el: Element) => {
			let range
			if (!lieProps['Element.getClientRects']) {
				return el.getClientRects()[0]
			} else if (!lieProps['Element.getBoundingClientRect']) {
				return el.getBoundingClientRect()
			} else if (!lieProps['Range.getClientRects']) {
				range = DOC.createRange()
				range.selectNode(el)
				return range.getClientRects()[0]
			}
			range = DOC.createRange()
			range.selectNode(el)
			return range.getBoundingClientRect()
		}

		const rectsId = `${instanceId}-client-rects-div`
		const divElement = document.createElement('div')
		divElement.setAttribute('id', rectsId)
		DOC.body.appendChild(divElement)

		patch(divElement, html`
		<div id="${rectsId}">
			<style>
			.rect-ghost,
			.rect-known {
				top: 0;
				left: 0;
				position: absolute;
				visibility: hidden;
			}
			.rect-known {
				width: 100px;
				height: 100px;
				transform: rotate(45deg);
			}
			.rect-ghost {
				width: 0;
				height: 0;
			}
			</style>
			<div class="rect-known"></div>
			<div class="rect-ghost"></div>
			<div style="perspective:100px;width:1000.099%;" id="rect-container">
				<style>
				.rects {
					width: 1000%;
					height: 1000%;
					max-width: 1000%;
				}
				.absolute {
					position: absolute;
				}
				#cRect1 {
					border: solid 2.715px;
					border-color: #F72585;
					padding: 3.98px;
					margin-left: 12.12px;
				}
				#cRect2 {
					border: solid 2px;
					border-color: #7209B7;
					font-size: 30px;
					margin-top: 20px;
					padding: 3.98px;
					transform: skewY(23.1753218deg) rotate3d(10.00099, 90, 0.100000000000009, 60000000000008.00000009deg);
				}
				#cRect3 {
					border: solid 2.89px;
					border-color: #3A0CA3;
					font-size: 45px;
					transform: skewY(-23.1753218deg) scale(1099.0000000099, 1.89) matrix(1.11, 2.0001, -1.0001, 1.009, 150, 94.4);
					margin-top: 50px;
				}
				#cRect4 {
					border: solid 2px;
					border-color: #4361EE;
					transform: matrix(1.11, 2.0001, -1.0001, 1.009, 150, 94.4);
					margin-top: 11.1331px;
					margin-left: 12.1212px;
					padding: 4.4545px;
					left: 239.4141px;
					top: 8.5050px;
				}
				#cRect5 {
					border: solid 2px;
					border-color: #4CC9F0;
					margin-left: 42.395pt;
				}
				#cRect6 {
					border: solid 2px;
					border-color: #F72585;
					transform: perspective(12890px) translateZ(101.5px);
					padding: 12px;
				}
				#cRect7 {
					margin-top: -350.552px;
					margin-left: 0.9099rem;
					border: solid 2px;
					border-color: #4361EE;
				}
				#cRect8 {
					margin-top: -150.552px;
					margin-left: 15.9099rem;
					border: solid 2px;
					border-color: #3A0CA3;
				}
				#cRect9 {
					margin-top: -110.552px;
					margin-left: 15.9099rem;
					border: solid 2px;
					border-color: #7209B7;
				}
				#cRect10 {
					margin-top: -315.552px;
					margin-left: 15.9099rem;
					border: solid 2px;
					border-color: #F72585;
				}
				#cRect11 {
					width: 10px;
					height: 10px;
					margin-left: 15.0000009099rem;
					border: solid 2px;
					border-color: #F72585;
				}
				#cRect12 {
					width: 10px;
					height: 10px;
					margin-left: 15.0000009099rem;
					border: solid 2px;
					border-color: #F72585;
				}
				#rect-container .shift-dom-rect {
					top: 1px !important;
					left: 1px !important;
				}
				</style>
				<div id="cRect1" class="rects"></div>
				<div id="cRect2" class="rects"></div>
				<div id="cRect3" class="rects"></div>
				<div id="cRect4" class="rects absolute"></div>
				<div id="cRect5" class="rects"></div>
				<div id="cRect6" class="rects"></div>
				<div id="cRect7" class="rects absolute"></div>
				<div id="cRect8" class="rects absolute"></div>
				<div id="cRect9" class="rects absolute"></div>
				<div id="cRect10" class="rects absolute"></div>
				<div id="cRect11" class="rects"></div>
				<div id="cRect12" class="rects"></div>
				<div id="emoji" class="emojis"></div>
			</div>
			<div id="emoji-container">
				<style>
				.domrect-emoji {
					font-family: ${CSS_FONT_FAMILY};
					font-size: 200px !important;
					height: auto;
					position: absolute !important;
					transform: scale(1.000999);
				}
				</style>
				${
					EMOJIS.map((emoji) => {
						return `<div class="domrect-emoji">${emoji}</div>`
					}).join('')
				}
			</div>
		</div>
		`)

		// get emoji set and system
		const pattern: Set<string> = new Set()
		await queueEvent(timer)

		const emojiElems = [...DOC.getElementsByClassName('domrect-emoji')]
		const emojiSet = emojiElems.reduce((emojiSet, el, i) => {
			const emoji = EMOJIS[i]
			const { height, width } = getBestRect(el)
			const dimensions = `${width},${height}`
			if (!pattern.has(dimensions)) {
				pattern.add(dimensions)
				emojiSet.add(emoji)
			}
			return emojiSet
		}, new Set() as Set<string>)

		const domrectSystemSum = 0.00001 * [...pattern].map((x) => {
			return x.split(',').reduce((acc, x) => acc += (+x||0), 0)
		}).reduce((acc, x) => acc += x, 0)

		// get clientRects
		const range = document.createRange()
		const rectElems = DOC.getElementsByClassName('rects')

		const elementClientRects = [...rectElems].map((el) => {
			return toNativeObject(el.getClientRects()[0])
		})

		const elementBoundingClientRect = [...rectElems].map((el) => {
			return toNativeObject(el.getBoundingClientRect())
		})

		const rangeClientRects = [...rectElems].map((el) => {
			range.selectNode(el)
			return toNativeObject(range.getClientRects()[0])
		})

		const rangeBoundingClientRect = [...rectElems].map((el) => {
			range.selectNode(el)
			return toNativeObject(el.getBoundingClientRect())
		})

		// detect failed shift calculation
		// inspired by https://arkenfox.github.io/TZP
		const rect4 = [...rectElems][3]
		const { top: initialTop } = elementClientRects[3]
		rect4.classList.add('shift-dom-rect')
		const { top: shiftedTop } = toNativeObject(rect4.getClientRects()[0])
		rect4.classList.remove('shift-dom-rect')
		const { top: unshiftedTop } = toNativeObject(rect4.getClientRects()[0])
		const diff = initialTop - shiftedTop
		const unshiftLie = diff != (unshiftedTop - shiftedTop)
		if (unshiftLie) {
			lied = true
			documentLie('Element.getClientRects', 'failed unshift calculation')
		}

		// detect failed math calculation lie
		let mathLie = false
		elementClientRects.forEach((rect) => {
			const { right, left, width, bottom, top, height, x, y } = rect
			if (
				right - left != width ||
				bottom - top != height ||
				right - x != width ||
				bottom - y != height
			) {
				lied = true
				mathLie = true
			}
			return
		})
		if (mathLie) {
			documentLie('Element.getClientRects', 'failed math calculation')
		}

		// detect equal elements mismatch lie
		const { right: right1, left: left1 } = elementClientRects[10]
		const { right: right2, left: left2 } = elementClientRects[11]
		if (right1 != right2 || left1 != left2) {
			documentLie('Element.getClientRects', 'equal elements mismatch')
			lied = true
		}

		// detect unknown rotate dimensions
		const knownEl = [...DOC.getElementsByClassName('rect-known')][0]
		const knownDimensions = toNativeObject(knownEl.getClientRects()[0])
		const knownHash = hashMini(knownDimensions)

		if (IS_BLINK) {
			const Rotate: Record<string, boolean> = {
				'9d9215cc': true, // 100, etc
				'47ded322': true, // 33, 67
				'd0eceaa8': true, // 90
			}
			if (!Rotate[knownHash]) {
				documentLie('Element.getClientRects', 'unknown rotate dimensions')
				lied = true
			}
		} else if (IS_GECKO) {
			const Rotate: Record<string, boolean> = {
				'e38453f0': true, // 100, etc
			}
			if (!Rotate[knownHash]) {
				documentLie('Element.getClientRects', 'unknown rotate dimensions')
				lied = true
			}
		}

		// detect ghost dimensions
		const ghostEl = [...DOC.getElementsByClassName('rect-ghost')][0]
		const ghostDimensions = toNativeObject(ghostEl.getClientRects()[0])
		const hasGhostDimensions = Object.keys(ghostDimensions)
			.some((key) => ghostDimensions[key] !== 0)

		if (hasGhostDimensions) {
			documentLie('Element.getClientRects', 'unknown ghost dimensions')
			lied = true
		}

		DOC.body.removeChild(DOC.getElementById(rectsId) as HTMLElement)

		logTestResult({ time: timer.stop(), test: 'rects', passed: true })
		return {
			elementClientRects,
			elementBoundingClientRect,
			rangeClientRects,
			rangeBoundingClientRect,
			emojiSet: [...emojiSet],
			domrectSystemSum,
			lied,
		}
	} catch (error) {
		logTestResult({ test: 'rects', passed: false })
		captureError(error)
		return
	}
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function clientRectsHTML(fp: any) {
	if (!fp.clientRects) {
		return `
		<div class="col-six undefined">
			<strong>DOMRect</strong>
			<div>elems A: ${HTMLNote.BLOCKED}</div>
			<div>elems B: ${HTMLNote.BLOCKED}</div>
			<div>range A: ${HTMLNote.BLOCKED}</div>
			<div>range B: ${HTMLNote.BLOCKED}</div>
			<div class="block-text">${HTMLNote.BLOCKED}</div>
		</div>`
	}
	const {
		clientRects: {
			$hash,
			elementClientRects,
			elementBoundingClientRect,
			rangeClientRects,
			rangeBoundingClientRect,
			emojiSet,
			domrectSystemSum,
			lied,
		},
	} = fp

	const computeDiffs = (rects: Record<string, number>[]) => {
		if (!rects || !rects.length) {
			return
		}
		const expectedSum = rects.reduce((acc, rect) => {
			const { right, left, width, bottom, top, height } = rect
			const expected = {
				width: right - left,
				height: bottom - top,
				right: left + width,
				left: right - width,
				bottom: top + height,
				top: bottom - height,
				x: right - width,
				y: bottom - height,
			}
			return acc += getRectSum(expected)
		}, 0)
		const actualSum = rects.reduce((acc, rect) => acc += getRectSum(rect), 0)
		return getDiffs({
			stringA: actualSum,
			stringB: expectedSum,
			charDiff: true,
			decorate: (diff) => `<span class="bold-fail">${diff}</span>`,
		})
	}

	const helpTitle = `Element.getClientRects()\nhash: ${hashMini(emojiSet)}\n${emojiSet.map((x: string, i: number) => i && (i % 6 == 0) ? `${x}\n` : x).join('')}`

	return `
	<div class="relative col-six${lied ? ' rejected' : ''}">
		<span class="aside-note">${performanceLogger.getLog().rects}</span>
		<strong>DOMRect</strong><span class="${lied ? 'lies ' : ''}hash">${hashSlice($hash)}</span>
		<div class="help" title="Element.getClientRects()">elems A: ${computeDiffs(elementClientRects)}</div>
		<div class="help" title="Element.getBoundingClientRect()">elems B: ${computeDiffs(elementBoundingClientRect)}</div>
		<div class="help" title="Range.getClientRects()">range A: ${computeDiffs(rangeClientRects)}</div>
		<div class="help" title="Range.getBoundingClientRect()">range B: ${computeDiffs(rangeBoundingClientRect)}</div>
		<div class="block-text help relative" title="${helpTitle}">
			<span>${domrectSystemSum || HTMLNote.UNSUPPORTED}</span>
			<span class="grey jumbo" style="font-family: ${CSS_FONT_FAMILY}">${formatEmojiSet(emojiSet)}</span>
		</div>
	</div>
	`
}
