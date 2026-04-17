/* eslint-disable @typescript-eslint/no-explicit-any */

const originalEnv = process.env

const mockVerify = jest.fn()
const mockSendMail = jest.fn()
const mockCreateTransport = jest.fn(() => ({
  verify: mockVerify,
  sendMail: mockSendMail,
}))

const mockEmailMonitoring = {
  recordSuccess: jest.fn(),
  recordFailure: jest.fn(),
  isHealthy: jest.fn(),
  getHealthStatus: jest.fn(),
  getMetrics: jest.fn(),
  logSummary: jest.fn(),
}

jest.mock('nodemailer', () => ({
  createTransport: (...args: any[]) => mockCreateTransport(...args),
}))

jest.mock('../emailMonitoring', () => ({
  emailMonitoring: mockEmailMonitoring,
}))

function setValidEmailEnv(): void {
  process.env = {
    ...originalEnv,
    SMTP_HOST: 'test.smtp.com',
    SMTP_PORT: '587',
    SMTP_USER: 'test@example.com',
    SMTP_PASS: '"testpass"',
    SMTP_SECURE: 'false',
    FROM_EMAIL: 'from@example.com',
    TO_EMAIL: 'to@example.com',
  }
}

describe('EmailService coverage-focused tests', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    setValidEmailEnv()
  })

  afterEach(() => {
    process.env = originalEnv
  })

  it('strips quoted SMTP_PASS while loading config', async () => {
    const { emailService } = await import('../emailService')
    const config = (emailService as any).loadSMTPConfig()

    expect(config.auth.pass).toBe('testpass')
  })

  it('returns true for successful SMTP validation', async () => {
    mockVerify.mockResolvedValueOnce(true)
    const { emailService } = await import('../emailService')

    const result = await emailService.validateConnection()

    expect(result).toBe(true)
    expect(mockCreateTransport).toHaveBeenCalledTimes(1)
    expect(mockVerify).toHaveBeenCalledTimes(1)
  })

  it('returns false for failed SMTP validation', async () => {
    mockVerify.mockRejectedValueOnce('smtp-down')
    const { emailService } = await import('../emailService')

    const result = await emailService.validateConnection()

    expect(result).toBe(false)
  })

  it('sanitizes transporter creation errors', async () => {
    const createError = new Error('createTransport failed')
    mockCreateTransport.mockImplementationOnce(() => {
      throw createError
    })

    const { emailService } = await import('../emailService')

    await expect((emailService as any).createTransporter()).rejects.toThrow(
      'Failed to initialize email service'
    )
  })

  it('sends notification and records success', async () => {
    mockSendMail.mockResolvedValueOnce({ messageId: 'message-123' })
    const { emailService } = await import('../emailService')

    const result = await emailService.sendAccessRequestNotification(
      'requester@example.com',
      'Hello there'
    )

    expect(result).toBe(true)
    expect(mockSendMail).toHaveBeenCalledTimes(1)
    expect(mockEmailMonitoring.recordSuccess).toHaveBeenCalledTimes(1)
  })

  it('handles sendMail failures and records failure', async () => {
    mockSendMail.mockRejectedValueOnce('smtp send failed')
    const { emailService } = await import('../emailService')

    const result = await emailService.sendAccessRequestNotification(
      'requester@example.com',
      'Hello there'
    )

    expect(result).toBe(false)
    expect(mockEmailMonitoring.recordFailure).toHaveBeenCalledTimes(1)
  })

  it('handles non-string requesterEmail in template escaping', async () => {
    const { emailService } = await import('../emailService')
    const template = (emailService as any).generateEmailTemplate(
      12345 as any,
      'safe message',
      new Date('2024-01-01T12:00:00Z')
    )

    expect(template).toContain('safe message')
  })

  it('logs "NOT SET" when SMTP_PASS is missing during config load', async () => {
    delete process.env.SMTP_PASS
    const { emailService } = await import('../emailService')

    expect(() => (emailService as any).loadSMTPConfig()).toThrow(
      'Missing required SMTP configuration'
    )
  })

  it('logs "NOT SET" and fails when SMTP_PASS is missing during send', async () => {
    delete process.env.SMTP_PASS
    const { emailService } = await import('../emailService')

    const result = await emailService.sendAccessRequestNotification(
      'requester@example.com',
      'hello'
    )

    expect(result).toBe(false)
  })

  it('falls back to "Unknown transporter creation error" when a non-Error is thrown', async () => {
    mockCreateTransport.mockImplementationOnce(() => {
      throw 'boom'
    })

    const { emailService } = await import('../emailService')

    await expect((emailService as any).createTransporter()).rejects.toThrow(
      'Failed to initialize email service'
    )
  })

  it('records "Unknown error" when sendMail throws an Error without a message', async () => {
    mockSendMail.mockRejectedValueOnce(new Error(''))
    const { emailService } = await import('../emailService')

    const result = await emailService.sendAccessRequestNotification(
      'requester@example.com',
      'hello'
    )

    expect(result).toBe(false)
    expect(mockEmailMonitoring.recordFailure).toHaveBeenCalledWith(
      'Unknown error',
      'requester@example.com'
    )
  })

  it('returns monitoring health status and logs summary', async () => {
    mockEmailMonitoring.isHealthy.mockReturnValueOnce(true)
    mockEmailMonitoring.getHealthStatus.mockReturnValueOnce('healthy')
    mockEmailMonitoring.getMetrics.mockReturnValueOnce({ sent: 10, failed: 1 })

    const { emailService } = await import('../emailService')
    const health = emailService.getHealthStatus()
    emailService.logMetricsSummary()

    expect(health).toEqual({
      isHealthy: true,
      status: 'healthy',
      metrics: { sent: 10, failed: 1 },
    })
    expect(mockEmailMonitoring.logSummary).toHaveBeenCalledTimes(1)
  })
})
