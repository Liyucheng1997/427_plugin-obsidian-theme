/** 把任意字符串变成合法的 CSS 字符串字面量（用于属性选择器 / content） */
export function cssStr(s: string): string {
  return '"' + s.replace(/\\/g, '\\\\').replace(/"/g, '\\"').replace(/\n/g, '\\a ') + '"';
}
