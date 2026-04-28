'use client';

import { useState, useRef, useEffect, useMemo } from 'react';
import { Plus, AlertCircle, Search, Loader2 } from 'lucide-react';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import { COSMETIC_CATEGORIES } from '@/constants/category';
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { cn } from '@/lib/utils';
import Input from '@/components/common/Input/Input';
import Header from '@/components/layout/Header/Header';

interface ProductDetailFormProps {
  initialData: any;
  onSubmit: (updatedData: any) => void | Promise<void>;
  onBack: () => void;
  submitLabel?: string;
  showScanWarning?: boolean;
  disableManualImageUpload?: boolean;
  autoFillNaverOnSubmit?: boolean;
}

export default function ProductDetailForm({
  initialData,
  onSubmit,
  onBack,
  submitLabel = '완료',
  showScanWarning = false,
  disableManualImageUpload = false,
  autoFillNaverOnSubmit = false,
}: ProductDetailFormProps) {
  const [formData, setFormData] = useState(initialData);
  const [isSearching, setIsSearching] = useState(false);
  const [showTip, setShowTip] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const tipRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!showTip) return;

    const handleClickOutside = (e: MouseEvent) => {
      if (tipRef.current && !tipRef.current.contains(e.target as Node)) {
        setShowTip(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showTip]);

  // 선택된 대분류 객체 찾기
  const selectedMainCategory = useMemo(() => {
    return COSMETIC_CATEGORIES.find((c) => c.value === formData.main_category);
  }, [formData.main_category]);

  // 대분류 변경 핸들러
  const handleMainChange = (value: string) => {
    // Etc(기타) 선택 시 소분류를 자동으로 Other(기타)로 설정
    const isEtc = value === 'Etc';
    setFormData({
      ...formData,
      main_category: value,
      sub_category: isEtc ? 'Other' : '', // 대분류 변경 시 소분류 초기화 (Etc 예외처리)
    });
  };

  useEffect(() => {
    return () => {
      if (formData.image_url && formData.image_url.startsWith('blob:')) {
        URL.revokeObjectURL(formData.image_url);
      }
    };
  }, [formData.image_url]);

  // 일반 텍스트 필드 정의 (카테고리 제외)
  const topFields = [
    { label: '브랜드명', field: 'brand_name' },
    { label: '제품명', field: 'product_name' },
  ];

  const bottomFields = [
    { label: '특징', field: 'features' },
    { label: '가격', field: 'price' },
    { label: '메모', field: 'memo' },
  ];

  const fetchNaverShoppingInfo = async (
    sourceData: any,
    options?: { showSuccessAlert?: boolean; showFailureAlert?: boolean },
  ) => {
    const { showSuccessAlert = true, showFailureAlert = true } = options ?? {};
    const { brand_name, product_name } = sourceData;
    if (!brand_name || !product_name) {
      if (showFailureAlert) {
        alert('브랜드명과 제품명을 모두 입력해야 검색이 가능합니다.');
      }
      return null;
    }

    const query = `${brand_name} ${product_name}`;
    setIsSearching(true);

    try {
      const res = await fetch(
        `/api/naver/search?query=${encodeURIComponent(query)}`,
      );
      if (!res.ok) throw new Error('검색 실패');
      const data = await res.json();

      if (data.official_image) {
        const nextData = (() => {
          const isFeaturesEmpty =
            !sourceData.features || String(sourceData.features).trim() === '';
          const categoryString = data.category_list
            ? data.category_list.join(', ')
            : '';
          return {
            ...sourceData,
            official_image: data.official_image,
            price: data.lowest_price,
            mall_url: data.mall_url,
            features: isFeaturesEmpty ? categoryString : sourceData.features,
          };
        })();
        setFormData(nextData);
        if (showSuccessAlert) {
          alert('상품 정보를 새로 가져왔습니다.');
        }
        return nextData;
      } else {
        if (showFailureAlert) {
          alert('검색 결과가 없습니다. 정보를 직접 확인해주세요.');
        }
        return null;
      }
    } catch (error) {
      console.error('Naver search error:', error);
      if (showFailureAlert) {
        alert('정보를 가져오는 중 오류가 발생했습니다.');
      }
      return null;
    } finally {
      setIsSearching(false);
    }
  };

  const handleReSearch = async () => {
    await fetchNaverShoppingInfo(formData);
  };

  const handleChange = (field: string, value: string) => {
    setFormData((prev: any) => ({ ...prev, [field]: value }));
  };

  const handleImageClick = () => {
    if (disableManualImageUpload) return;
    fileInputRef.current?.click();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (disableManualImageUpload) return;
    const file = e.target.files?.[0];
    if (file) {
      if (formData.image_url?.startsWith('blob:')) {
        URL.revokeObjectURL(formData.image_url);
      }
      const previewUrl = URL.createObjectURL(file);
      setFormData((prev: any) => ({
        ...prev,
        official_image: null,
        image_url: previewUrl,
        imageFile: file,
      }));
    }
  };

  const handleSubmit = async () => {
    let submitData = formData;

    // TODO: 테스트 이후 직접 등록의 자동 네이버 보강 정책 재검토 필요
    if (autoFillNaverOnSubmit) {
      const enriched = await fetchNaverShoppingInfo(formData, {
        showSuccessAlert: false,
      });
      if (!enriched?.official_image) {
        alert(
          '네이버쇼핑 정보(특히 상품 이미지) 조회에 실패해 등록할 수 없습니다.',
        );
        return;
      }
      submitData = enriched;
    }

    await onSubmit(submitData);
  };

  return (
    <div className="flex min-h-full flex-col bg-white">
      <Header
        className="border-b border-zinc-100"
        onBack={onBack}
        title="상품 정보"
        rightIcons={[
          {
            kind: 'register',
            text: submitLabel,
            ariaLabel: submitLabel,
            onClick: () => void handleSubmit(),
          },
        ]}
      />

      <main className="flex-1 space-y-6 p-5">
        {/* 제품 이미지 섹션 */}
        <div
          onClick={handleImageClick}
          className={cn(
            'group relative mx-auto aspect-square w-36 overflow-hidden rounded-3xl bg-zinc-100 shadow-inner',
            disableManualImageUpload ? 'cursor-not-allowed opacity-80' : 'cursor-pointer',
          )}
        >
          <Image
            src={
              formData.official_image ||
              formData.image_url ||
              '/icons/imgplus.svg'
            }
            alt="product"
            fill
            className={cn(
              'transition-opacity group-hover:opacity-80',
              !formData.official_image && !formData.image_url
                ? 'object-none p-10'
                : 'object-cover',
            )}
          />
          <div
            className={cn(
              'absolute inset-0 flex items-center justify-center bg-black/10 opacity-0 transition-opacity group-hover:opacity-100',
              disableManualImageUpload && 'opacity-100',
            )}
          >
            <div className="flex size-12 items-center justify-center rounded-full bg-black/40 text-white backdrop-blur-md">
              <Plus size={28} />
            </div>
          </div>
          {disableManualImageUpload && (
            // TODO: 테스트 이후 직접 이미지 업로드 재오픈 필요
            <div className="absolute inset-x-0 bottom-2 text-center text-[11px] font-medium text-zinc-700">
              테스트용: 직접 업로드 임시 비활성화
            </div>
          )}
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileChange}
            accept="image/*"
            className="hidden"
          />
        </div>

        <div className="space-y-5">
          <div className="flex items-center justify-between px-1">
            <span className="text-sm font-bold tracking-wider text-zinc-400 uppercase">
              제품 정보
            </span>

            <div className="flex items-center gap-2">
              {/* 네이버쇼핑 정보 채우기 툴팁 */}
              <div className="relative" ref={tipRef}>
                <button
                  type="button"
                  onClick={() => setShowTip((v) => !v)}
                  className="flex size-4 cursor-pointer items-center justify-center rounded-full bg-zinc-200 text-[10px] font-bold text-zinc-500"
                >
                  ?
                </button>
                {showTip && (
                  <div className="absolute bottom-6 left-1/2 z-10 w-44 -translate-x-1/2 rounded-lg bg-zinc-800 px-3 py-2 text-[11px] text-white shadow-lg">
                    브랜드명과 제품명을 입력해주세요
                    <div className="absolute -bottom-1 left-1/2 size-2 -translate-x-1/2 rotate-45 bg-zinc-800" />
                  </div>
                )}
              </div>
              <Button
                onClick={handleReSearch}
                disabled={isSearching}
                size="sm"
                className="rounded-full border-0 bg-[#03C75A] text-white shadow-none hover:bg-[#03C75A]/90"
              >
                {isSearching ? (
                  <Loader2 size={14} className="animate-spin" />
                ) : (
                  <Search size={14} />
                )}
                네이버쇼핑 정보 채우기
              </Button>
            </div>
          </div>

          {/* 브랜드명, 제품명 */}
          {topFields.map((input) => (
            <div key={input.field} className="flex flex-col gap-1.5">
              <label className="pl-1 text-xs font-bold text-zinc-700">
                {input.label}
              </label>
              <Input
                value={formData[input.field] || ''}
                onChange={(e) => handleChange(input.field, e.target.value)}
                placeholder={`${input.label}을 입력해주세요`}
              />
            </div>
          ))}

          {/* 대분류 */}
          <div className="flex flex-col gap-1.5">
            <label className="pl-1 text-xs font-bold text-zinc-700">
              대분류
            </label>
            <Select
              value={formData.main_category}
              onValueChange={handleMainChange}
            >
              <SelectTrigger className="border-mono-gray focus:border-brand-pink h-12 w-full rounded-sm border px-4 text-sm focus:ring-0">
                <SelectValue placeholder="대분류를 선택해주세요" />
              </SelectTrigger>
              <SelectContent
                position="popper"
                className="z-10 rounded-sm border-zinc-100 bg-white shadow-xl"
              >
                <SelectGroup>
                  {COSMETIC_CATEGORIES.map((cat) => (
                    <SelectItem
                      key={cat.value}
                      value={cat.value}
                      className="py-3"
                    >
                      {cat.label}
                    </SelectItem>
                  ))}
                </SelectGroup>
              </SelectContent>
            </Select>
          </div>

          {/* 소분류 */}
          <div className="flex flex-col gap-1.5">
            <label className="pl-1 text-xs font-bold text-zinc-700">
              소분류
            </label>
            <Select
              value={formData.sub_category}
              onValueChange={(value) => handleChange('sub_category', value)}
              disabled={
                !formData.main_category || formData.main_category === 'Etc'
              }
            >
              <SelectTrigger
                className={cn(
                  'border-mono-gray focus:border-brand-pink h-12 w-full rounded-sm border px-4 text-sm focus:ring-0',
                  (!formData.main_category ||
                    formData.main_category === 'Etc') &&
                    'opacity-50',
                )}
              >
                <SelectValue
                  placeholder={
                    formData.main_category
                      ? '소분류를 선택해주세요'
                      : '대분류를 먼저 선택해주세요'
                  }
                />
              </SelectTrigger>
              <SelectContent
                position="popper"
                className="rounded-sm border-zinc-100 bg-white shadow-xl"
              >
                <SelectGroup>
                  {selectedMainCategory?.subCategories.map((sub) => (
                    <SelectItem
                      key={sub.value}
                      value={sub.value}
                      className="py-3"
                    >
                      {sub.label}
                    </SelectItem>
                  ))}
                </SelectGroup>
              </SelectContent>
            </Select>
          </div>

          {/* 특징, 가격, 메모 */}
          {bottomFields.map((input) => (
            <div key={input.field} className="flex flex-col gap-1.5">
              <label className="pl-1 text-xs font-bold text-zinc-700">
                {input.label}
              </label>
              <Input
                value={formData[input.field] || ''}
                onChange={(e) => handleChange(input.field, e.target.value)}
                placeholder={`${input.label}을 입력해주세요`}
              />
            </div>
          ))}
        </div>

        {showScanWarning && (
          <div className="flex items-center gap-2 rounded-xl bg-zinc-50 p-4 text-xs text-zinc-500">
            <AlertCircle size={14} className="text-zinc-400" />
            <span>
              스캔 입력의 경우 정보가 정확하지 않을 수 있으니 확인 부탁드려요!
            </span>
          </div>
        )}
      </main>
    </div>
  );
}
