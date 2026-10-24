import type { Attachment } from 'svelte/attachments';
import { prefersReducedMotion } from 'svelte/motion';

/** Calls fn once, the first time a quarter of the element is on screen. */
export function onView(fn: () => void): Attachment<Element> {
	return (node) => {
		const io = new IntersectionObserver(
			(entries) => {
				if (entries.some((e) => e.isIntersecting)) {
					io.disconnect();
					fn();
				}
			},
			{ threshold: 0.25 }
		);
		io.observe(node);
		return () => io.disconnect();
	};
}

/**
 * Plays the element's .draw, .fade, and .wipe children once when it scrolls into view (see layout.css).
 * Without JS or with reduced motion the element is never armed, so it shows its end state.
 */
export const reveal: Attachment<Element> = (node) => {
	if (prefersReducedMotion.current) return;
	node.classList.add('armed');
	return onView(() => node.classList.add('in'))(node);
};
