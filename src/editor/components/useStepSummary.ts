import { useCallback } from 'react';

import { useI18n } from '@/i18n';

import type { EditorBox, EditorEffect, EditorPoint, EditorStep, EditorStroke } from '../types';


function formatValue(value: number): string {
  return (Number.isInteger(value)) ? String(value) : value.toFixed(2).replace(/0+$/, '').replace(/\.$/, '');
}


// the one line under a step's name: its text, and the params changed from their defaults
export function useStepSummary() {
  const { t, plural } = useI18n();
  return useCallback((effect: EditorEffect | undefined, step: EditorStep): string => {
    if (!effect) {
      return '';
    }
    const parts: Array<string> = [];
    for (const param of effect.params) {
      const value = step.params[param.name];
      if (value === null || value === undefined) {
        continue;
      }
      const name = param.name.replace(/_/g, ' ');
      switch (param.kind) {
        case 'text': {
          if (typeof value === 'string' && value) {
            parts.push(`“${value}”`);
          }
          break;
        }
        case 'number':
        case 'integer': {
          if (typeof value === 'number' && value !== param.default) {
            parts.push(`${name} ${formatValue(value)}`);
          }
          break;
        }
        case 'boolean': {
          if (value !== param.default) {
            parts.push(`${name} ${(value) ? t('editor.summary.on') : t('editor.summary.off')}`);
          }
          break;
        }
        case 'choice': {
          if (value !== param.default) {
            parts.push(String(value).toLowerCase());
          }
          break;
        }
        case 'strokes': {
          parts.push(plural('editor.summary.strokes', (value as Array<EditorStroke>).length));
          break;
        }
        case 'box': {
          const box = value as EditorBox;
          parts.push(`${Math.round(box.width * 100)}×${Math.round(box.height * 100)}%`);
          break;
        }
        case 'point': {
          const point = value as EditorPoint;
          parts.push(t('editor.summary.at', {x: Math.round(point.x * 100), y: Math.round(point.y * 100)}));
          break;
        }
        default:
          break;
      }
    }
    return parts.join(' · ');
  }, [t, plural]);
}
