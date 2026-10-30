// Keep multilingual text and normal emoji; reject invisible display-spoofing controls.
export function safeChatText(text: string): boolean {
  const withoutEmoji = text.replace(/\p{Extended_Pictographic}[\uFE0F\p{Emoji_Modifier}]*(?:\u200D\p{Extended_Pictographic}[\uFE0F\p{Emoji_Modifier}]*)+/gu, '');
  return !/[\p{Cf}\p{Cc}]/u.test(withoutEmoji.replace(/[\n\r\t]/g, ''));
}
