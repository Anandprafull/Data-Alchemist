import { atom } from 'recoil'
import type { ValidationResult } from '@/lib/utils/validators'

export interface DataState {
  clients: any[]
  workers: any[]
  tasks: any[]
}

export const dataState = atom<DataState>({
  key: 'dataState',
  default: {
    clients: [],
    workers: [],
    tasks: []
  }
})

export const validationState = atom<ValidationResult>({
  key: 'validationState',
  default: {
    clients: [],
    workers: [],
    tasks: []
  }
})
