export function getSelector(selectors) {
  const selectorValue = Object.values(selectors)
  let res = []
  selectorValue.forEach((item) => res.concat(item.selectors))
  return res
}
