import { redirect } from 'next/navigation';

interface Props {
  params: Promise<{ diaryId: string }>;
}

export default async function EditDiaryPage({ params }: Props) {
  const { diaryId } = await params;
  redirect(`/diary/new?edit=${diaryId}`);
}
