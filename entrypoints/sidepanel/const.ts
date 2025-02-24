export type Option = {
  id: string
  value: string
}

type FormValue = {
  idList: string[]
}

export function formInit(): FormValue {
  return {
    idList: [],
  }
}
