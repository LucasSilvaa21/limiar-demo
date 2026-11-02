import katex from '../../public/vendor/katex/katex.js';

export function typesetEquations(root) {
  for (const element of root.querySelectorAll('[data-tex]')) {
    katex.render(element.dataset.tex, element, {
      displayMode: element.classList.contains('equation'),
      output: 'htmlAndMathml',
      throwOnError: true,
      strict: 'error',
      trust: false
    });
  }
}
