import { useEffect } from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { Form, Input } from 'antd';
import { fillUntouched } from '@/shared/utils/fillUntouched';

interface Profile { name: string; logo_url: string }

function ProfileForm({ data }: { data: Profile }) {
  const [form] = Form.useForm();
  useEffect(() => { fillUntouched(form, data); }, [data, form]);
  return (
    <Form form={form}>
      <Form.Item name="name" label="Name"><Input /></Form.Item>
      <Form.Item name="logo_url" label="Logo"><Input /></Form.Item>
    </Form>
  );
}

describe('forms refreshed from the server while open', () => {
  it('keep what the user typed and still take new server values for other fields', async () => {
    const view = render(<ProfileForm data={{ name: 'Tessa', logo_url: '' }} />);
    const user = userEvent.setup();
    await waitFor(() => expect(screen.getByLabelText('Name')).toHaveValue('Tessa'));
    await user.clear(screen.getByLabelText('Name'));
    await user.type(screen.getByLabelText('Name'), 'Tessa Skopje');

    // e.g. a logo upload refreshes the whole profile
    view.rerender(<ProfileForm data={{ name: 'Tessa', logo_url: '/storage/logo.png' }} />);

    await waitFor(() => expect(screen.getByLabelText('Logo')).toHaveValue('/storage/logo.png'));
    expect(screen.getByLabelText('Name')).toHaveValue('Tessa Skopje');
  });
});
