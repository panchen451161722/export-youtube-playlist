import { m } from '@/paraglide/messages.js';
import { getLocale } from '@/paraglide/runtime.js';

/** One source for visible questions and their structured representation. */
export function landingFaqItems(locale = getLocale()) {
  const options = { locale };
  return [
    {
      question: m['landing.faq.public_private.question']({}, options),
      answer: m['landing.faq.public_private.answer']({}, options),
    },
    {
      question: m['landing.faq.limit.question']({}, options),
      answer: m['landing.faq.limit.answer']({}, options),
    },
    {
      question: m['landing.faq.retention.question']({}, options),
      answer: m['landing.faq.retention.answer']({}, options),
    },
    {
      question: m['landing.faq.formats.question']({}, options),
      answer: m['landing.faq.formats.answer']({}, options),
    },
    {
      question: m['landing.faq.quota.question']({}, options),
      answer: m['landing.faq.quota.answer']({}, options),
    },
    {
      question: m['landing.faq.media.question']({}, options),
      answer: m['landing.faq.media.answer']({}, options),
    },
  ];
}

export function landingFaqSchema(locale = getLocale()) {
  return {
    '@type': 'FAQPage',
    inLanguage: locale,
    mainEntity: landingFaqItems(locale).map(({ question, answer }) => ({
      '@type': 'Question',
      name: question,
      acceptedAnswer: { '@type': 'Answer', text: answer },
    })),
  };
}
