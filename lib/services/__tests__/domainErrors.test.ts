import { createDomainError, DOMAIN_ERROR_CODES } from '../domainErrors'

describe('domainErrors', () => {
  it('creates stable error payloads with known domain codes', () => {
    const err = createDomainError(DOMAIN_ERROR_CODES.networkError, 'Network down')

    expect(err).toEqual({
      code: DOMAIN_ERROR_CODES.networkError,
      message: 'Network down',
    })
  })
})
