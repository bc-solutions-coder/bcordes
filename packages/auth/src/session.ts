import { readSession, readSessionRef } from '@bc-solutions-coder/sdk/server'
import { getRequest } from '@tanstack/react-start/server'
import { getBff } from './bff'

export function getSession() {
  const bff = getBff()
  return readSession(getRequest(), bff.config, bff.store)
}

export function hasSessionReference(): boolean {
  return readSessionRef(getRequest(), getBff().config) !== null
}
