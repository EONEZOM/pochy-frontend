'use client';

import { Modal } from '@/components/common/Modal';

type PouchDraftResumeModalProps = {
  open: boolean;
  onStartFresh: () => void;
  onResume: () => void;
};

export function PouchDraftResumeModal({
  open,
  onStartFresh,
  onResume,
}: PouchDraftResumeModalProps) {
  return (
    <Modal
      open={open}
      onOpenChange={() => {}}
      hideIcon
      closeOnOverlayClick={false}
      closeOnCancel={false}
      closeOnConfirm={false}
      title={'이전에 만들던 기록이 있습니다'}
      description={'삭제 하고 다시 만들겠습니까?'}
      showCancel
      cancelText={'새로하기'}
      confirmText={'이어하기'}
      onCancel={onStartFresh}
      onConfirm={onResume}
    />
  );
}
