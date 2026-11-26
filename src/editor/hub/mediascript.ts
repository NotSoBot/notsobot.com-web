import type { EditorTemplateInput } from '../types';


// The MediaScript line that runs a template on the media key `media` (`template MEDIA_KEY CODE NAME=value`), with a
// `KEY="..."` placeholder per thing it asks for: each is replaced with a value (a file input takes a link), or left
// out to keep the template's own
export function templateLine(code: string, inputs?: Array<Pick<EditorTemplateInput, 'key'>>): string {
  return ['template media', code, ...(inputs ?? []).map((input) => `${input.key}="..."`)].join(' ');
}
