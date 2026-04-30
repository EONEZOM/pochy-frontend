import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Header } from '@/components/layout/Header';

const MyCosmeticsPage = () => {
  return (
    <div className="flex h-full flex-col">
      <Header title="내 화장품" />

      <div className="flex flex-1 flex-col items-center justify-center gap-6 p-8">
        <div className="text-center">
          <p className="text-mono-jet text-lg font-black">내 화장품 파우치</p>
          <p className="text-mono-dark-gray mt-2 text-sm">
            화장품 사진을 스캔해서 AI가 분석해드려요
          </p>
        </div>

        <Link href="/my-cosmetics/register" className="w-full max-w-xs">
          <Button className="bg-mono-jet text-mono-white h-12 w-full rounded-full font-bold">
            화장품 스캔 등록하기
          </Button>
        </Link>
      </div>
    </div>
  );
};

export default MyCosmeticsPage;
