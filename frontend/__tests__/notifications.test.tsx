import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import NotificationsPage from '@/app/notifications/page'

vi.mock('@/lib/api/client', () => ({
  default: {
    get: vi.fn(() => Promise.resolve({ data: { results: [ { id: 1, title: 'Hello', message: 'World', is_read: false, created_at: new Date().toISOString() } ] } })),
    post: vi.fn(() => Promise.resolve({ data: { detail: 'ok' } })),
  }
}))

describe('Notifications page', () => {
  it('renders notifications and can mark one read', async () => {
    render(<NotificationsPage />)

    expect(await screen.findByText('Hello')).toBeInTheDocument()
    const markBtn = screen.getByText(/Mark read/i)
    await userEvent.click(markBtn)

    await waitFor(() => expect(screen.queryByText(/Mark read/i)).not.toBeInTheDocument())
  })
})
