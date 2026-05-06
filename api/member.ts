import { customInstance } from '@/api/axios-instance';

export const deleteMember = async () => {
  return customInstance<void>({
    url: '/api/member',
    method: 'DELETE',
  });
};
