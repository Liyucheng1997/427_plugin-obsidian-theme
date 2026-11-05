// 阅读底色：只染笔记正文区（Markdown 视图），侧栏和浮层不变。
// 低饱和、偏暖，降低白底的刺眼感；每种都配一个同色系的正文墨色，深色模式有对应的暗色版。

export type PaperId = 'none' | 'warm' | 'sepia' | 'green' | 'gray';

export interface Paper {
  id: PaperId;
  name: string;
  light: { bg: string; ink: string };
  dark: { bg: string; ink: string };
}

export const PAPERS: Paper[] = [
  { id: 'none', name: '默认白', light: { bg: '#FFFFFF', ink: '' }, dark: { bg: '#1C1C1E', ink: '' } },
  { id: 'warm', name: '暖白', light: { bg: '#F8F5EE', ink: '#2E2A26' }, dark: { bg: '#22201D', ink: '#E6E0D6' } },
  { id: 'sepia', name: '米黄', light: { bg: '#F3EAD5', ink: '#3B3125' }, dark: { bg: '#2A251F', ink: '#E8DCC6' } },
  { id: 'green', name: '豆沙绿', light: { bg: '#E3EDD6', ink: '#2B3327' }, dark: { bg: '#1F2620', ink: '#D8E3D1' } },
  { id: 'gray', name: '浅灰', light: { bg: '#EDEDEF', ink: '#2B2B2E' }, dark: { bg: '#252527', ink: '#E2E2E6' } },
];

export const paperById = (id: string): Paper => PAPERS.find(p => p.id === id) ?? PAPERS[0];
