import {useEffect} from 'react';

export function useDialogFocus(active: boolean) {
  useEffect(() => {
    if (!active) return;
    const previous = document.activeElement as HTMLElement | null;
    const dialog = document.querySelector<HTMLElement>('[role="dialog"]');
    if (!dialog) return;
    const controls = () => [...dialog.querySelectorAll<HTMLElement>('button:not(:disabled),a[href],input:not(:disabled),select:not(:disabled),textarea:not(:disabled),[tabindex="0"]')];
    dialog.tabIndex = -1;
    (controls()[0] ?? dialog).focus({preventScroll:true});
    const trap = (event: KeyboardEvent) => {
      if (event.key !== 'Tab') return;
      const items = controls(), first = items[0], last = items.at(-1);
      if (!first) { event.preventDefault(); dialog.focus({preventScroll:true}); }
      else if (!dialog.contains(document.activeElement) || event.shiftKey && document.activeElement === first) {event.preventDefault(); (event.shiftKey ? last : first)?.focus({preventScroll:true});}
      else if (!event.shiftKey && document.activeElement === last) {event.preventDefault(); first.focus({preventScroll:true});}
    };
    document.addEventListener('keydown', trap);
    return () => {document.removeEventListener('keydown', trap); if (previous?.isConnected) previous.focus({preventScroll:true});};
  }, [active]);
}
