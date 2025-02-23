export type Option = {
  id: string
  value: string
}

type FormValue = {
  items: string[]
}

export function formInit(): FormValue {
  return {
    items: [],
  }
}
