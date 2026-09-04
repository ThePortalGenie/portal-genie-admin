import {
  COMMUNICATION_CATEGORIES,
  COMMUNICATION_CATEGORY_LABELS,
  CommunicationTemplate,
} from '../../../core/domain/template.types';

export type TemplateLibraryGroup = {
  category: (typeof COMMUNICATION_CATEGORIES)[number];
  label: string;
  templates: CommunicationTemplate[];
};

export function groupTemplatesForLibrary(
  templates: readonly CommunicationTemplate[],
  query: string,
): TemplateLibraryGroup[] {
  const needle = query.trim().toLowerCase();
  const available = templates.filter((template) => template.available);
  const filtered = needle
    ? available.filter((template) =>
        [template.name, template.purpose, template.lifecycleStage].some((value) =>
          value.toLowerCase().includes(needle),
        ),
      )
    : available;

  return COMMUNICATION_CATEGORIES.map((category) => ({
    category,
    label: COMMUNICATION_CATEGORY_LABELS[category],
    templates: filtered.filter((template) => template.category === category),
  })).filter((group) => group.templates.length > 0);
}
