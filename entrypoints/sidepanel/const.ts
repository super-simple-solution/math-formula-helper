export type Option = {
  id: string
  value: string
}

type FormValue = {
  idList: string[]
}

// Creates the default side-panel selection form state.
export function formInit(): FormValue {
  return {
    idList: [],
  }
}
