'use client';

import { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import { Plus, AlertCircle, Search, Loader2, Info } from 'lucide-react';
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
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
} from '@/components/ui/drawer';
import { cn } from '@/lib/utils';
import { resolveMediaUrl } from '@/lib/resolve-media-url';
import Input from '@/components/common/Input/Input';
import { Header } from '@/components/layout/Header';

/** Figma 상세 폼: 입력·셀렉트 공통 스타일 (전역 `p` 규칙보다 우선하도록 `!` 사용) */
const FIELD_LABEL_CLASS =
  '!text-[11px] font-bold leading-normal tracking-tight text-[#161618]';
const INPUT_SURFACE_CLASS =
  '!bg-[#F3F3F3] rounded-xl border-0 text-[#161618] !text-sm placeholder:text-[#B7B7B7] focus-visible:border-[#FF93DB] focus-visible:ring-1 focus-visible:ring-[#FF93DB]/35';
const SELECT_TRIGGER_CLASS = cn(
  'h-12 w-full rounded-xl border-0 bg-[#F3F3F3] px-4 !text-sm font-normal text-[#161618] shadow-none',
  'focus:border-[#FF93DB] focus:ring-1 focus:ring-[#FF93DB]/35 focus-visible:ring-[#FF93DB]/35',
  'data-placeholder:text-[#B7B7B7] [&_svg]:text-[#B7B7B7]',
);
const SELECT_CONTENT_CLASS =
  'rounded-xl border border-[#E8E8E8] bg-white p-1.5 shadow-xl';
const SELECT_ITEM_CLASS =
  'cursor-pointer rounded-lg py-3 pl-3 pr-9 text-sm focus:bg-[#FFF7FC] focus:text-[#161618]';

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
  const [priceGuideOpen, setPriceGuideOpen] = useState(false);
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

  const fetchNaverShoppingInfo = useCallback(async (
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
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // 스캔 결과 뷰에서 열렸고 official_image가 없으면 마운트 즉시 자동 재검색합니다.
  // 수동으로 버튼을 누르지 않아도 누락된 네이버 정보를 채웁니다.
  // showScanWarning이 true인 경우에만 동작하므로 직접 등록 폼에서는 실행되지 않습니다.
  useEffect(() => {
    if (!showScanWarning) return;
    if (initialData?.official_image) return;
    if (!initialData?.brand_name || !initialData?.product_name) return;

    fetchNaverShoppingInfo(initialData, {
      showSuccessAlert: false,
      showFailureAlert: false,
    });
  // 마운트 1회만 실행합니다.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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
        className="h-10 min-h-10 border-0 bg-white/95 px-[20px] py-2.5 shadow-none backdrop-blur-[30px] [&_h3]:font-bold [&_h3]:leading-5 [&_h3]:text-[#161618]"
        onBack={onBack}
        title="상품 정보"
        rightIcons={[
          {
            kind: 'register',
            text: submitLabel,
            ariaLabel: submitLabel,
            onClick: () => void handleSubmit(),
            className:
              'h-9 rounded-full border-0 bg-[#FF93DB] px-4 font-bold text-[#161618] hover:bg-[#FF85D5]',
          },
        ]}
      />

      <main className="flex flex-1 flex-col gap-6 px-[20px] pt-5 pb-8">
        {/* 제품 이미지 섹션 */}
        <div
          onClick={handleImageClick}
          className={cn(
            'group relative mx-auto aspect-square w-full max-w-[200px] overflow-hidden rounded-2xl bg-[#F3F3F3]',
            disableManualImageUpload ? 'cursor-not-allowed opacity-80' : 'cursor-pointer',
          )}
        >
          <Image
            src={
              formData.official_image || formData.image_url
                ? resolveMediaUrl(
                    String(
                      formData.official_image || formData.image_url || '',
                    ),
                  )
                : '/icons/imgplus.svg'
            }
            alt="product"
            fill
            unoptimized={Boolean(
              typeof formData.image_url === 'string' &&
                formData.image_url.startsWith('blob:'),
            )}
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

        <div className="flex flex-col gap-5">
          <div className="flex flex-wrap items-center justify-between gap-x-2 gap-y-2">
            <span className="text-[11px] font-bold tracking-[0.08em] text-[#B7B7B7] uppercase">
              제품 정보
            </span>

            <div className="flex shrink-0 items-center gap-2">
              {/* 네이버쇼핑 정보 채우기 툴팁 */}
              <div className="relative" ref={tipRef}>
                <button
                  type="button"
                  onClick={() => setShowTip((v) => !v)}
                  className="flex size-4 cursor-pointer items-center justify-center rounded-full bg-[#E8E8E8] text-[10px] font-bold text-[#B7B7B7]"
                >
                  ?
                </button>
                {showTip && (
                  <div className="absolute bottom-6 left-1/2 z-10 w-44 -translate-x-1/2 rounded-lg bg-[#161618] px-3 py-2 text-[11px] text-white shadow-lg">
                    브랜드명과 제품명을 입력해주세요
                    <div className="absolute -bottom-1 left-1/2 size-2 -translate-x-1/2 rotate-45 bg-[#161618]" />
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
            <div key={input.field} className="flex flex-col gap-2">
              <label className={FIELD_LABEL_CLASS}>{input.label}</label>
              <Input
                value={formData[input.field] || ''}
                onChange={(e) => handleChange(input.field, e.target.value)}
                placeholder={`${input.label}을 입력해주세요`}
                className={INPUT_SURFACE_CLASS}
              />
            </div>
          ))}

          {/* 대분류 */}
          <div className="flex flex-col gap-2">
            <label className={FIELD_LABEL_CLASS}>대분류</label>
            <Select
              value={formData.main_category}
              onValueChange={handleMainChange}
            >
              <SelectTrigger className={SELECT_TRIGGER_CLASS}>
                <SelectValue placeholder="대분류를 선택해주세요" />
              </SelectTrigger>
              <SelectContent
                position="popper"
                className={cn('z-50', SELECT_CONTENT_CLASS)}
              >
                <SelectGroup>
                  {COSMETIC_CATEGORIES.map((cat) => (
                    <SelectItem
                      key={cat.value}
                      value={cat.value}
                      className={SELECT_ITEM_CLASS}
                    >
                      {cat.label}
                    </SelectItem>
                  ))}
                </SelectGroup>
              </SelectContent>
            </Select>
          </div>

          {/* 소분류 */}
          <div className="flex flex-col gap-2">
            <label className={FIELD_LABEL_CLASS}>소분류</label>
            <Select
              value={formData.sub_category}
              onValueChange={(value) => handleChange('sub_category', value)}
              disabled={
                !formData.main_category || formData.main_category === 'Etc'
              }
            >
              <SelectTrigger
                className={cn(
                  SELECT_TRIGGER_CLASS,
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
                className={cn('z-50', SELECT_CONTENT_CLASS)}
              >
                <SelectGroup>
                  {selectedMainCategory?.subCategories.map((sub) => (
                    <SelectItem
                      key={sub.value}
                      value={sub.value}
                      className={SELECT_ITEM_CLASS}
                    >
                      {sub.label}
                    </SelectItem>
                  ))}
                </SelectGroup>
              </SelectContent>
            </Select>
          </div>

          {/* 특징 */}
          <div className="flex flex-col gap-2">
            <label className={FIELD_LABEL_CLASS}>특징</label>
            <Input
              value={formData.features || ''}
              onChange={(e) => handleChange('features', e.target.value)}
              placeholder="특징을 입력해주세요"
              className={INPUT_SURFACE_CLASS}
            />
          </div>

          {/* 가격 — 우측 안내 버튼 → 바텀시트 */}
          <div className="flex flex-col gap-2">
            <label className={FIELD_LABEL_CLASS}>가격</label>
            <Input
              value={formData.price || ''}
              onChange={(e) => handleChange('price', e.target.value)}
              placeholder="가격을 입력해주세요"
              className={INPUT_SURFACE_CLASS}
              inputMode="numeric"
              rightElement={
                <button
                  type="button"
                  onClick={() => setPriceGuideOpen(true)}
                  className="flex size-9 cursor-pointer items-center justify-center rounded-full bg-white shadow-sm ring-1 ring-[#E8E8E8] transition active:scale-[0.98]"
                  aria-label="가격 입력 안내"
                >
                  <Info className="size-[18px] text-[#161618]" strokeWidth={2} />
                </button>
              }
            />
          </div>

          {/* 메모 */}
          <div className="flex flex-col gap-2">
            <label className={FIELD_LABEL_CLASS}>메모</label>
            <Input
              value={formData.memo || ''}
              onChange={(e) => handleChange('memo', e.target.value)}
              placeholder="메모를 입력해주세요"
              className={INPUT_SURFACE_CLASS}
            />
          </div>
        </div>

        {showScanWarning && (
          <div className="flex items-start gap-2 rounded-lg bg-[#FFF7FC] px-3 py-2.5">
            <AlertCircle
              size={16}
              className="mt-0.5 shrink-0 text-[#FF93DB]"
              strokeWidth={2}
            />
            <span className="!text-[11px] !leading-[150%] font-normal text-[#161618]">
              스캔 입력의 경우 정보가 정확하지 않을 수 있으니 확인 부탁드려요!
            </span>
          </div>
        )}
      </main>

      {/* 가격 입력 안내 (Figma 보조 패널 스타일) */}
      <Drawer open={priceGuideOpen} onOpenChange={setPriceGuideOpen}>
        <DrawerContent className="mx-auto max-w-[480px] border-0 bg-white shadow-2xl">
          <DrawerHeader className="space-y-2 px-5 pb-0 pt-2 text-left">
            <DrawerTitle className="!text-lg font-bold leading-tight text-[#161618]">
              가격 입력 안내
            </DrawerTitle>
            <DrawerDescription asChild>
              <div className="!text-[11px] !leading-[150%] font-normal text-[#161618]">
                숫자만 입력해 주세요. 「네이버쇼핑 정보 채우기」를 사용하면 네이버
                쇼핑 최저가가 자동으로 들어올 수 있어요. 표시된 금액은 참고용이며,
                필요하면 직접 수정할 수 있어요.
              </div>
            </DrawerDescription>
          </DrawerHeader>

          <DrawerFooter className="border-t-0 px-5 pb-6 pt-4">
            <DrawerClose asChild>
              <Button
                type="button"
                className="h-14 w-full rounded-full border-0 bg-[#FF93DB] text-base font-bold text-[#161618] hover:bg-[#FF85D5]"
              >
                확인
              </Button>
            </DrawerClose>
          </DrawerFooter>
        </DrawerContent>
      </Drawer>
    </div>
  );
}
