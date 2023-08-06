export function copyLatex(latexContext, el) {
  // https://web.dev/async-clipboard/
  navigator.clipboard.writeText(latexContext).then(() => {
    el.classList.add('sss-copyed')
    el.addEventListener(
      'mouseout',
      () => {
        setTimeout(() => el.classList.remove('sss-copyed'), 500)
      },
      { once: true },
    )
  })
}
