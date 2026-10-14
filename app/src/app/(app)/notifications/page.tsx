import { redirect } from 'next/navigation';

// Access requests now live on Users & access.
export default function NotificationsPage() {
  redirect('/users?tab=pending');
}
