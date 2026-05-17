'use client';

import {
  useState,
  useRef,
  useEffect,
  useMemo,
  useCallback,
  type ReactNode,
} from 'react';
import { Loader2, X, Share2, Download } from 'lucide-react';
import Image from 'next/image';
import { COSMETIC_CATEGORIES } from '@/constants/category';
import { WISH_PLACEHOLDER_IMAGE_SRC } from '@/constants/wish-placeholders';
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Carousel,
  CarouselContent,
  CarouselItem,
} from '@/components/ui/carousel';
import { cn } from '@/lib/utils';
import { resolveMediaUrl } from '@/lib/resolve-media-url';
import Input from '@/components/common/Input/Input';
import { Header } from '@/components/layout/Header';
import { WishCardImage } from '@/components/wishlist/WishCardImage';
import { useYoutubeReview } from '@/hooks/queries/useYoutubeReview';
const MEMO_MAX_LEN = 60;

/** Figma `위시 - 스캔수정상세` (1:2233) 상단 안내 */
const SCAN_EDIT_AI_BANNER_COPY =
  'AI가 정보를 자동으로 채워두었어요.\n혹시 실제와 다른 내용이 있다면, 눌러서 바로 수정이 가능해요.';

/** Figma `Group 756` 드롭다운 (1:2358): 흰 배경 + 얕은 그림자 */
const scanSelectContentClassName =
  'max-h-[min(280px,var(--radix-select-content-available-height))] min-w-[var(--radix-select-trigger-width)] rounded-md border-0 bg-white p-0 py-2 shadow-[1px_1px_2px_0_rgba(0,0,0,0.25)] data-[state=open]:animate-none';

const scanSelectItemClassName =
  'relative cursor-pointer rounded-none py-2 pr-4 pl-4 text-[11px] font-normal leading-[150%] text-[#B7B7B7] focus:bg-[#FAFAFA] focus:text-[#B7B7B7] data-highlighted:bg-[#FAFAFA] data-highlighted:text-[#B7B7B7] [&>span:first-child]:hidden';

const scanSelectTriggerClassName =
  'h-[37px] w-full min-w-0 justify-between gap-2 rounded-[4px] border-[0.5px] border-[#DCDCDC] bg-white px-2.5 text-[11px] font-normal text-[#161618] shadow-none outline-none focus-visible:border-[#DCDCDC] focus-visible:ring-0 data-placeholder:text-[#B7B7B7] [&_svg]:size-4 [&_svg]:shrink-0 [&_svg]:text-[#B7B7B7]';

const scanTextInputClassName =
  'h-auto min-h-[37px] rounded-[4px] border-[0.5px] border-[#DCDCDC] px-2.5 py-2.5 text-xs font-bold text-[#161618] placeholder:font-normal placeholder:text-[#B7B7B7] focus-visible:border-[#DCDCDC] focus-visible:ring-0';

function WishCapturePreviewImage({
  previewSrc,
  alt = '',
  variant = 'thumb',
}: {
  previewSrc: string;
  alt?: string;
  variant?: 'thumb' | 'modal';
}) {
  if (previewSrc === WISH_PLACEHOLDER_IMAGE_SRC) {
    const iconSize = variant === 'modal' ? 48 : 28;
    return (
      <span className="pointer-events-none flex size-full items-center justify-center">
        <Image
          src={WISH_PLACEHOLDER_IMAGE_SRC}
          alt=""
          width={iconSize}
          height={iconSize}
          className="object-contain"
        />
      </span>
    );
  }

  if (variant === 'modal') {
    return <Image src={previewSrc} alt={alt} fill className="object-contain" />;
  }

  return <Image src={previewSrc} alt={alt} fill className="object-cover" />;
}

function WishFieldLabel({ children }: { children: ReactNode }) {
  return (
    <div className="text-mono-dark-gray mb-2 text-sm font-semibold">
      {children}
    </div>
  );
}

function WishFieldRow({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
  return (
    <div className="flex items-start gap-2">
      <div className="min-w-0 flex-1">
        <WishFieldLabel>{label}</WishFieldLabel>
        {children}
      </div>
      <Image
        src="/icons/PenNewSquare.svg"
        alt=""
        width={24}
        height={24}
        className="mt-9 shrink-0"
        aria-hidden
      />
    </div>
  );
}

type ProductDetailFormData = {
  brand_name: string;
  product_name: string;
  main_category: string;
  sub_category: string;
  features: string;
  price: string | number;
  memo: string;
  official_image?: string | null;
  image_url?: string | null;
  mall_url?: string | null;
  imageFile?: File | null;
  /** 직접 등록 누끼 Blob — 제출 시 directImage로 사용 */
  nukkiBlob?: Blob | null;
};

export type ProductDetailFormImageSelectResult = {
  official_image?: string;
  nukkiBlob?: Blob;
};

type ProductDetailFormInitialData = Partial<ProductDetailFormData>;

export type ProductDetailFormSubmitData = ProductDetailFormData &
  Record<string, unknown>;

type ProductDetailFormStringField =
  | 'brand_name'
  | 'product_name'
  | 'main_category'
  | 'sub_category'
  | 'features'
  | 'price'
  | 'memo';

interface ProductDetailFormProps {
  initialData: ProductDetailFormInitialData;
  onSubmit: (updatedData: ProductDetailFormSubmitData) => void | Promise<void>;
  onBack: () => void;
  submitLabel?: string;
  /** 헤더 제목. 스캔 수정 단계는 항상 「사진으로 등록하기」가 우선입니다. */
  headerTitle?: string;
  /** 직접 등록하기 등 피그마 전용 레이아웃 (헤더·본문 320·하단 pill). */
  layoutVariant?: 'default' | 'directRegister';
  showScanWarning?: boolean;
  disableManualImageUpload?: boolean;
  autoFillNaverOnSubmit?: boolean;
  scanItemIndex?: number;
  scanItemCount?: number;
  onScanPrev?: () => void;
  onScanNext?: () => void;
  canScanPrev?: boolean;
  canScanNext?: boolean;
  /** directRegister 레이아웃에서 가격 필드 숨김 */
  hidePrice?: boolean;
  /** 연관 리뷰 영상 섹션·API 호출 숨김 (내 화장품 스캔 등) */
  hideYoutubeReview?: boolean;
  /** 사진 선택 직후 호출 (누끼 등 후처리) */
  onImageFileSelected?: (
    file: File,
  ) => Promise<ProductDetailFormImageSelectResult>;
  /** AI 자동완성 등으로 공식 이미지 URL이 채워진 뒤 호출 (누끼 등 후처리) */
  onOfficialImageUrlSelected?: (
    imageUrl: string,
  ) => Promise<ProductDetailFormImageSelectResult>;
}

const FORM_DEFAULTS = {
  brand_name: '',
  product_name: '',
  main_category: COSMETIC_CATEGORIES[0]?.value ?? 'Base',
  sub_category:
    COSMETIC_CATEGORIES[0]?.subCategories[0]?.value ?? 'Highlighter',
  features: '',
  price: '',
  memo: '',
};

export default function ProductDetailForm({
  initialData,
  onSubmit,
  onBack,
  submitLabel = '저장하기',
  headerTitle,
  layoutVariant = 'default',
  showScanWarning = false,
  disableManualImageUpload = false,
  autoFillNaverOnSubmit = false,
  scanItemIndex,
  scanItemCount,
  onScanPrev,
  onScanNext,
  canScanPrev = false,
  canScanNext = false,
  hidePrice = false,
  hideYoutubeReview = false,
  onImageFileSelected,
  onOfficialImageUrlSelected,
}: ProductDetailFormProps) {
  const isDirectRegisterLayout = layoutVariant === 'directRegister';
  const [isImageProcessing, setIsImageProcessing] = useState(false);
  const [formData, setFormData] = useState<ProductDetailFormData>(() => ({
    ...FORM_DEFAULTS,
    ...initialData,
  }));
  const [isSearching, setIsSearching] = useState(false);
  const [showCapture, setShowCapture] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showNaverLowestPriceTip, setShowNaverLowestPriceTip] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const selectedMainCategory = useMemo(() => {
    return COSMETIC_CATEGORIES.find((c) => c.value === formData.main_category);
  }, [formData.main_category]);

  const subOptions = selectedMainCategory?.subCategories ?? [];

  const handleMainChange = (value: string) => {
    const isEtc = value === 'Etc';
    setFormData({
      ...formData,
      main_category: value,
      sub_category: isEtc ? 'Other' : '',
    });
  };

  const applyOfficialImageNukki = useCallback(
    async (imageUrl: string, baseData: ProductDetailFormData) => {
      if (!onOfficialImageUrlSelected) {
        return baseData;
      }

      if (baseData.official_image?.startsWith('blob:')) {
        URL.revokeObjectURL(baseData.official_image);
      }

      setIsImageProcessing(true);
      try {
        const result = await onOfficialImageUrlSelected(imageUrl);
        const merged: ProductDetailFormData = {
          ...baseData,
          image_url: imageUrl,
          official_image: result.official_image ?? imageUrl,
          nukkiBlob: result.nukkiBlob ?? null,
        };
        setFormData(merged);
        return merged;
      } finally {
        setIsImageProcessing(false);
      }
    },
    [onOfficialImageUrlSelected],
  );

  const fetchNaverShoppingInfo = useCallback(
    async (
      sourceData: ProductDetailFormInitialData,
      options?: {
        showSuccessAlert?: boolean;
        showFailureAlert?: boolean;
        showLoading?: boolean;
      },
    ): Promise<ProductDetailFormData | null> => {
      const { showSuccessAlert = true, showFailureAlert = true } =
        options ?? {};
      const { showLoading = true } = options ?? {};
      const { brand_name, product_name } = sourceData;
      if (!brand_name || !product_name) {
        if (showFailureAlert) {
          alert('브랜드명과 제품명을 모두 입력해야 검색이 가능합니다.');
        }
        return null;
      }

      const query = `${brand_name} ${product_name}`;
      if (showLoading) {
        setIsSearching(true);
      }

      try {
        const res = await fetch(
          `/api/naver/search?query=${encodeURIComponent(query)}`,
        );
        if (!res.ok) {
          throw new Error('검색 실패');
        }
        const data = (await res.json()) as {
          official_image?: string | null;
          lowest_price?: string | number | null;
          mall_url?: string | null;
          category_list?: string[];
        };

        if (data.official_image) {
          const naverImageUrl = String(data.official_image).trim();
          const nextData = (() => {
            const isFeaturesEmpty =
              !sourceData.features || String(sourceData.features).trim() === '';
            const categoryString = data.category_list
              ? data.category_list.join(', ')
              : '';
            return {
              ...sourceData,
              official_image: naverImageUrl,
              price: data.lowest_price ?? '',
              mall_url: data.mall_url,
              features: isFeaturesEmpty
                ? categoryString
                : String(sourceData.features ?? ''),
            };
          })() as ProductDetailFormData;

          setFormData(nextData);

          const mergedData = onOfficialImageUrlSelected
            ? await applyOfficialImageNukki(naverImageUrl, nextData)
            : nextData;

          if (showSuccessAlert) {
            alert('상품 정보를 새로 가져왔습니다.');
          }
          return mergedData;
        }

        const priceRaw = data.lowest_price;
        const hasPrice =
          priceRaw !== undefined &&
          priceRaw !== null &&
          String(priceRaw).trim() !== '' &&
          String(priceRaw).trim() !== '정보 없음';

        if (hasPrice) {
          const nextData = {
            ...sourceData,
            price: priceRaw,
            ...(data.mall_url ? { mall_url: data.mall_url } : {}),
          } as ProductDetailFormData;
          setFormData(nextData);
          if (showSuccessAlert) {
            alert('네이버 쇼핑 최저가를 반영했습니다.');
          }
          return nextData;
        }

        if (showFailureAlert) {
          alert('검색 결과가 없습니다. 정보를 직접 확인해주세요.');
        }
        return null;
      } catch (error) {
        console.error('Naver search error:', error);
        if (showFailureAlert) {
          alert('정보를 가져오는 중 오류가 발생했습니다.');
        }
        return null;
      } finally {
        if (showLoading) {
          setIsSearching(false);
        }
      }
    },
    [applyOfficialImageNukki, onOfficialImageUrlSelected],
  );

  // 스캔 결과 보정용.
  useEffect(() => {
    if (!showScanWarning) {
      return;
    }
    if (initialData?.official_image) {
      return;
    }
    if (!initialData?.brand_name || !initialData?.product_name) {
      return;
    }

    const timerId = window.setTimeout(() => {
      void fetchNaverShoppingInfo(initialData, {
        showSuccessAlert: false,
        showFailureAlert: false,
        showLoading: false,
      });
    }, 0);
    return () => window.clearTimeout(timerId);
  }, [fetchNaverShoppingInfo, initialData, showScanWarning]);

  const handleReSearch = async () => {
    await fetchNaverShoppingInfo(formData);
  };

  const handleChange = (field: ProductDetailFormStringField, value: string) => {
    setFormData((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (disableManualImageUpload) {
      return;
    }
    const file = e.target.files?.[0];
    if (!file) {
      return;
    }

    const applyFileSelection = async () => {
      if (formData.image_url?.startsWith('blob:')) {
        URL.revokeObjectURL(formData.image_url);
      }
      if (formData.official_image?.startsWith('blob:')) {
        URL.revokeObjectURL(formData.official_image);
      }

      const previewUrl = URL.createObjectURL(file);
      const hasNaverOfficial =
        String(formData.official_image ?? '').trim().length > 0 &&
        !formData.official_image?.startsWith('blob:');

      const basePatch: Partial<ProductDetailFormData> = {
        image_url: previewUrl,
        imageFile: file,
        nukkiBlob: null,
      };

      if (isDirectRegisterLayout && hasNaverOfficial) {
        setFormData((prev) => ({
          ...prev,
          ...basePatch,
        }));
      } else {
        setFormData((prev) => ({
          ...prev,
          ...basePatch,
          official_image: null,
        }));
      }

      if (!onImageFileSelected) {
        return;
      }

      setIsImageProcessing(true);
      try {
        const result = await onImageFileSelected(file);
        setFormData((prev) => ({
          ...prev,
          image_url: previewUrl,
          imageFile: file,
          official_image: result.official_image ?? prev.official_image,
          nukkiBlob: result.nukkiBlob ?? null,
        }));
      } finally {
        setIsImageProcessing(false);
      }
    };

    void applyFileSelection();
    e.target.value = '';
  };

  const handleSubmit = async () => {
    let submitData = formData;

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

  const handleSaveClick = async () => {
    if (isSubmitting) {
      return;
    }
    setIsSubmitting(true);
    try {
      await handleSubmit();
    } finally {
      setIsSubmitting(false);
    }
  };

  const youtubeQuery = useMemo(() => {
    const b = String(formData.brand_name ?? '').trim();
    const p = String(formData.product_name ?? '').trim();
    return `${b} ${p}`.trim();
  }, [formData.brand_name, formData.product_name]);

  const { data: youtubeData, isLoading: isYoutubeLoading } = useYoutubeReview(
    youtubeQuery,
    { enabled: !hideYoutubeReview },
  );

  const isScanEditLayout = showScanWarning;
  const scanIndexText = useMemo(() => {
    const index = typeof scanItemIndex === 'number' ? scanItemIndex + 1 : 1;
    const count = typeof scanItemCount === 'number' ? scanItemCount : undefined;
    if (!count || count <= 0) return `${index}ㅣN`;
    return `${index}ㅣ${count}`;
  }, [scanItemCount, scanItemIndex]);

  const officialForCard = String(formData.official_image ?? '').trim();
  const captureForCard = String(formData.image_url ?? '').trim();
  const captureFilePreviewSrc = useMemo(() => {
    const imageFile = formData.imageFile;
    if (!(imageFile instanceof File)) {
      return '';
    }
    return URL.createObjectURL(imageFile);
  }, [formData.imageFile]);

  useEffect(() => {
    if (!captureFilePreviewSrc.startsWith('blob:')) {
      return;
    }
    return () => {
      URL.revokeObjectURL(captureFilePreviewSrc);
    };
  }, [captureFilePreviewSrc]);

  const capturePreviewSrc = useMemo(() => {
    const rawCapture = String(formData.image_url ?? '').trim();
    if (rawCapture) {
      return resolveMediaUrl(rawCapture);
    }
    if (captureFilePreviewSrc) {
      return captureFilePreviewSrc;
    }
    return WISH_PLACEHOLDER_IMAGE_SRC;
  }, [captureFilePreviewSrc, formData.image_url]);

  /** 직접 등록 상단 카드: 네이버 공식 이미지·직접 촬영·업로드 파일 중 하나라도 있으면 미리보기 표시 */
  const hasDirectRegisterProductImage = useMemo(() => {
    if (String(formData.official_image ?? '').trim()) {
      return true;
    }
    if (String(formData.image_url ?? '').trim()) {
      return true;
    }
    if (formData.imageFile instanceof File) {
      return true;
    }
    return false;
  }, [formData.imageFile, formData.image_url, formData.official_image]);

  const resolvedHeaderTitle = isScanEditLayout
    ? '사진으로 등록하기'
    : (headerTitle ?? '제품 상세보기');

  const handleCaptureShare = async () => {
    if (
      !capturePreviewSrc ||
      capturePreviewSrc === WISH_PLACEHOLDER_IMAGE_SRC
    ) {
      return;
    }
    try {
      if (navigator.share) {
        await navigator.share({
          title: `${String(formData.product_name ?? '제품')} 캡처`,
          url: capturePreviewSrc,
        });
        return;
      }
      await navigator.clipboard.writeText(capturePreviewSrc);
      alert('이미지 링크가 복사되었습니다.');
    } catch (error) {
      if ((error as Error).name !== 'AbortError') {
        alert('공유에 실패했습니다.');
      }
    }
  };

  const handleCaptureDownload = async () => {
    if (
      !capturePreviewSrc ||
      capturePreviewSrc === WISH_PLACEHOLDER_IMAGE_SRC
    ) {
      return;
    }
    try {
      const response = await fetch(capturePreviewSrc);
      const blob = await response.blob();
      const objectUrl = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = objectUrl;
      link.download = `wish-capture-${String(formData.product_name ?? 'image').slice(0, 40)}.jpg`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(objectUrl);
    } catch {
      window.open(capturePreviewSrc, '_blank', 'noopener,noreferrer');
    }
  };

  return (
    <div className="relative flex min-h-0 flex-1 flex-col bg-white">
      <div className="sticky top-0 z-40 shrink-0 bg-white pt-[var(--safe-area-top)]">
        <Header
          sticky={false}
          className={cn(
            isScanEditLayout
              ? 'h-10 min-h-10 border-0 bg-white/95 px-[20px] py-2.5 shadow-none backdrop-blur-[30px] [&_h3]:leading-5 [&_h3]:font-bold [&_h3]:text-[#161618]'
              : isDirectRegisterLayout
                ? 'h-10 min-h-10 border-0 bg-white/95 px-[20px] py-2.5 shadow-none backdrop-blur-[30px] [&_h3]:leading-5 [&_h3]:font-bold [&_h3]:text-[#161618]'
                : 'border-b border-zinc-100',
          )}
          title={resolvedHeaderTitle}
          showBack
          onBack={onBack}
        />
      </div>

      <div className="overflow-anchor-none flex-1 overflow-y-auto px-[20px] pb-36">
        <div className={cn(isDirectRegisterLayout && 'mx-auto w-full')}>
          {isScanEditLayout ? (
            <div className="mt-4 space-y-3">
              <div className="flex items-start gap-2">
                <Image
                  src="/icons/느낌표-pink.svg"
                  alt=""
                  width={15}
                  height={15}
                  className="mt-px shrink-0"
                  aria-hidden
                />
                <p className="text-[11px] leading-[150%] font-normal whitespace-pre-line text-[#FF60CA]">
                  {SCAN_EDIT_AI_BANNER_COPY}
                </p>
              </div>
            </div>
          ) : null}

          <div
            className={cn(
              'relative',
              isScanEditLayout
                ? 'mt-4'
                : isDirectRegisterLayout
                  ? 'mt-4'
                  : 'mt-2',
            )}
          >
            {isDirectRegisterLayout ? (
              <>
                {!disableManualImageUpload ? (
                  <input
                    id="wish-direct-register-photo-input"
                    type="file"
                    ref={fileInputRef}
                    onChange={handleFileChange}
                    accept="image/*"
                    className="hidden"
                  />
                ) : null}

                {!hasDirectRegisterProductImage && !disableManualImageUpload ? (
                  <label
                    htmlFor="wish-direct-register-photo-input"
                    className={cn(
                      'relative mx-auto flex aspect-square w-full max-w-[260px] cursor-pointer flex-col items-center justify-center gap-2 rounded-lg border-[0.5px] border-[#DCDCDC] bg-[#F3F3F3] px-4 transition-colors',
                      'hover:bg-[#EAEAEA]',
                    )}
                  >
                    <Image
                      src={WISH_PLACEHOLDER_IMAGE_SRC}
                      alt=""
                      width={56}
                      height={56}
                      className="object-contain"
                      aria-hidden
                    />
                    <span className="text-center text-[11px] leading-[150%] font-normal text-[#6C6C6C]">
                      터치하여 사진을 추가해 주세요.
                    </span>
                  </label>
                ) : (
                  <div
                    className={cn(
                      'relative mx-auto aspect-square w-full max-w-[260px] overflow-hidden rounded-lg bg-[#F3F3F3] shadow-[1px_1px_1px_0_rgba(0,0,0,0.25)]',
                      !disableManualImageUpload &&
                        'cursor-pointer transition-opacity hover:opacity-95',
                    )}
                  >
                    {!disableManualImageUpload ? (
                      <button
                        type="button"
                        className="absolute inset-0 z-10 bg-transparent"
                        aria-label="사진 변경"
                        onClick={() => fileInputRef.current?.click()}
                      />
                    ) : null}
                    <WishCardImage
                      officialImage={officialForCard}
                      captureImage={captureForCard}
                      productName={String(formData.product_name ?? '')}
                      fill
                      className="object-contain"
                      priority
                    />
                    {isImageProcessing ? (
                      <div
                        className="absolute inset-0 z-20 flex items-center justify-center bg-white/70"
                        aria-live="polite"
                        aria-busy="true"
                      >
                        <Loader2
                          className="size-8 animate-spin text-[#FF60CA]"
                          aria-hidden
                        />
                      </div>
                    ) : null}
                  </div>
                )}
              </>
            ) : (
              <div
                className={cn(
                  'relative mx-auto',
                  isScanEditLayout
                    ? 'h-[200px] w-[208px] max-w-full overflow-visible rounded-lg bg-[#F3F3F3] shadow-[1px_1px_1px_0_rgba(0,0,0,0.25)]'
                    : 'aspect-square w-full max-w-[260px] overflow-hidden rounded-2xl bg-zinc-100',
                )}
              >
                {isScanEditLayout ? (
                  <>
                    <button
                      type="button"
                      onClick={onScanPrev}
                      disabled={!canScanPrev}
                      className="absolute top-1/2 -left-20 z-10 h-16 w-16 -translate-y-1/2 disabled:opacity-30 [&_img]:size-12"
                      aria-label="이전 제품"
                    >
                      <Image
                        src="/icons/Alt Arrow Left.svg"
                        alt=""
                        width={48}
                        height={48}
                        aria-hidden
                      />
                    </button>
                    <button
                      type="button"
                      onClick={onScanNext}
                      disabled={!canScanNext}
                      className="absolute top-1/2 -right-20 z-10 h-16 w-16 -translate-y-1/2 disabled:opacity-30 [&_img]:size-12"
                      aria-label="다음 제품"
                    >
                      <Image
                        src="/icons/Alt Arrow Right.svg"
                        alt=""
                        width={48}
                        height={48}
                        aria-hidden
                      />
                    </button>
                  </>
                ) : null}
                <WishCardImage
                  officialImage={officialForCard}
                  captureImage={captureForCard}
                  productName={String(formData.product_name ?? '')}
                  fill
                  className="object-contain"
                  priority
                />
              </div>
            )}
          </div>

          {!isScanEditLayout ? (
            <div className="mt-3 flex w-full justify-end">
              <button
                type="button"
                disabled={isSearching}
                onClick={() => void handleReSearch()}
                className={cn(
                  'inline-flex min-h-[32px] w-full max-w-[100px] shrink-0 items-center justify-center gap-1.5 rounded-full px-4 transition-opacity disabled:opacity-60',
                  'border-[0.5px] border-[#B7B7B7] bg-white text-[11px] font-bold text-[#B7B7B7]',
                  'shadow-[1px_1px_2px_0_rgba(0,0,0,0.08)]',
                )}
              >
                <span>{isSearching ? '불러오는 중' : 'AI 자동완성'}</span>
              </button>
            </div>
          ) : null}

          {isScanEditLayout ? (
            <div className="mt-3 flex justify-center">
              <div className="flex h-4 w-[68px] items-center justify-center rounded-full bg-[#161618] text-[9px] font-bold text-white">
                {scanIndexText}
              </div>
            </div>
          ) : null}

          {isScanEditLayout ? (
            <div className="mt-2 flex justify-end">
              <button
                type="button"
                disabled={isSearching}
                onClick={() => void handleReSearch()}
                className="inline-flex h-8 min-w-[91px] items-center justify-center gap-1.5 rounded-full bg-[#FFC6EC] px-4 text-xs font-bold text-white transition-opacity disabled:opacity-60"
              >
                {isSearching ? (
                  <Loader2
                    size={14}
                    className="shrink-0 animate-spin"
                    aria-hidden
                  />
                ) : null}
                <span>{isSearching ? '불러오는 중' : 'AI 자동완성'}</span>
              </button>
            </div>
          ) : null}

          {isScanEditLayout || isDirectRegisterLayout ? (
            <div className="mt-6 space-y-4">
              <div>
                <div className="mb-1 text-[11px] leading-[150%] font-normal text-[#6C6C6C]">
                  브랜드명
                </div>
                <Input
                  value={formData.brand_name || ''}
                  onChange={(e) => handleChange('brand_name', e.target.value)}
                  placeholder="브랜드명"
                  aria-label="브랜드명"
                  className={scanTextInputClassName}
                />
              </div>

              <div>
                <div className="mb-1 text-[11px] leading-[150%] font-normal text-[#6C6C6C]">
                  제품명
                </div>
                <Input
                  value={formData.product_name || ''}
                  onChange={(e) => handleChange('product_name', e.target.value)}
                  placeholder="제품명"
                  aria-label="제품명"
                  className={scanTextInputClassName}
                />
              </div>

              {!hidePrice ? (
                <div>
                  <div className="mb-1 text-[11px] leading-[150%] font-normal text-[#6C6C6C]">
                    가격
                  </div>
                  <div className="flex min-h-[37px] items-center gap-2 rounded-[4px] border-[0.5px] border-[#DCDCDC] px-2.5 py-2">
                    <span className="shrink-0 text-[11px] font-normal text-[#FF60CA]">
                      최저가
                    </span>
                    <input
                      type="number"
                      inputMode="numeric"
                      placeholder="0"
                      value={formData.price || ''}
                      onChange={(e) => handleChange('price', e.target.value)}
                      className="min-w-0 flex-1 border-0 bg-transparent p-0 text-xs font-bold text-[#161618] outline-none placeholder:font-normal placeholder:text-[#B7B7B7]"
                      aria-label="가격"
                    />
                    <span className="shrink-0 text-xs font-bold text-[#161618]">
                      원
                    </span>
                    <div className="relative shrink-0">
                      {showNaverLowestPriceTip ? (
                        <div className="absolute right-[-10px] bottom-full z-10 mb-1 flex justify-end">
                          <Image
                            src="/icons/네이버최저가.svg"
                            alt="네이버 최저가 안내"
                            width={103}
                            height={47}
                            className="h-auto w-[103px] max-w-[min(103px,calc(100vw-40px))]"
                          />
                        </div>
                      ) : null}
                      <button
                        type="button"
                        onClick={() => {
                          setShowNaverLowestPriceTip((open) => !open);
                        }}
                        className="shrink-0"
                        aria-expanded={showNaverLowestPriceTip}
                        aria-label="네이버 최저가 안내 보기"
                      >
                        <Image
                          src="/icons/warning.svg"
                          alt=""
                          width={15}
                          height={15}
                          aria-hidden
                        />
                      </button>
                    </div>
                  </div>
                </div>
              ) : null}

              <div>
                <div className="mb-1 text-[11px] leading-[150%] font-normal text-[#6C6C6C]">
                  분류
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <Select
                    value={formData.main_category}
                    onValueChange={handleMainChange}
                  >
                    <SelectTrigger
                      className={scanSelectTriggerClassName}
                      aria-label="대분류"
                    >
                      <SelectValue placeholder="대분류" />
                    </SelectTrigger>
                    <SelectContent
                      position="popper"
                      sideOffset={6}
                      className={scanSelectContentClassName}
                    >
                      <SelectGroup className="flex flex-col gap-2 p-0">
                        {COSMETIC_CATEGORIES.map((c) => (
                          <SelectItem
                            key={c.value}
                            value={c.value}
                            className={scanSelectItemClassName}
                          >
                            {c.label}
                          </SelectItem>
                        ))}
                      </SelectGroup>
                    </SelectContent>
                  </Select>
                  <Select
                    value={formData.sub_category}
                    onValueChange={(value) =>
                      handleChange('sub_category', value)
                    }
                    disabled={
                      !formData.main_category ||
                      formData.main_category === 'Etc'
                    }
                  >
                    <SelectTrigger
                      className={cn(
                        scanSelectTriggerClassName,
                        (!formData.main_category ||
                          formData.main_category === 'Etc') &&
                          'opacity-50',
                      )}
                      aria-label="소분류"
                    >
                      <SelectValue
                        placeholder={
                          formData.main_category
                            ? '소분류'
                            : '대분류를 먼저 선택해 주세요'
                        }
                      />
                    </SelectTrigger>
                    <SelectContent
                      position="popper"
                      sideOffset={6}
                      className={scanSelectContentClassName}
                    >
                      <SelectGroup className="flex flex-col gap-2 p-0">
                        {subOptions.map((s) => (
                          <SelectItem
                            key={s.value}
                            value={s.value}
                            className={scanSelectItemClassName}
                          >
                            {s.label}
                          </SelectItem>
                        ))}
                      </SelectGroup>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div>
                <div className="mb-1 text-[11px] leading-[150%] font-normal text-[#6C6C6C]">
                  특징
                </div>
                <Input
                  value={formData.features || ''}
                  onChange={(e) => handleChange('features', e.target.value)}
                  placeholder="특징"
                  aria-label="특징"
                  className="h-auto min-h-[37px] rounded-[4px] border-[0.5px] border-[#DCDCDC] px-2.5 py-2.5 text-[11px] leading-[150%] font-normal text-[#161618] placeholder:text-[#B7B7B7] focus-visible:border-[#DCDCDC] focus-visible:ring-0"
                />
              </div>

              <div>
                <div className="mb-1 text-[11px] leading-[150%] font-normal text-[#6C6C6C]">
                  메모
                </div>
                <textarea
                  value={formData.memo || ''}
                  maxLength={MEMO_MAX_LEN}
                  onChange={(e) => handleChange('memo', e.target.value)}
                  placeholder="구매처, 가격, 할인 정보 등 잊기 쉬운 것들을 메모해 보세요. (최대 60자)"
                  rows={4}
                  className="focus-visible:border-brand-pink w-full resize-none rounded-[4px] border-[0.5px] border-[#DCDCDC] px-2.5 py-2.5 text-[11px] leading-[150%] font-normal text-[#161618] outline-none placeholder:text-[#6C6C6C]/80 focus-visible:ring-0"
                  aria-label="메모"
                />
                <p className="mt-1 text-[11px] text-[#B7B7B7]">
                  {String(formData.memo ?? '').length}/{MEMO_MAX_LEN}
                </p>
              </div>

              <div>
                <div className="mb-1 text-[11px] leading-[150%] font-normal text-[#6C6C6C]">
                  원본 사진
                </div>
                <button
                  type="button"
                  onClick={() => {
                    if (disableManualImageUpload) {
                      setShowCapture(true);
                      return;
                    }
                    fileInputRef.current?.click();
                  }}
                  className={cn(
                    'relative size-[72px] overflow-hidden rounded-lg border-[0.5px] border-[#DCDCDC] bg-[#F3F3F3]',
                    !disableManualImageUpload && 'cursor-pointer',
                  )}
                  aria-label={
                    disableManualImageUpload
                      ? '원본 사진 크게 보기'
                      : '사진 변경'
                  }
                >
                  <WishCapturePreviewImage previewSrc={capturePreviewSrc} />
                </button>
                {!disableManualImageUpload && !isDirectRegisterLayout ? (
                  <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handleFileChange}
                    accept="image/*"
                    className="hidden"
                  />
                ) : null}
              </div>
            </div>
          ) : (
            <div className="mt-8 space-y-6">
              <WishFieldRow label="브랜드명">
                <Input
                  value={formData.brand_name || ''}
                  onChange={(e) => handleChange('brand_name', e.target.value)}
                  placeholder="브랜드명"
                  aria-label="브랜드명"
                />
              </WishFieldRow>

              <WishFieldRow label="제품명">
                <Input
                  value={formData.product_name || ''}
                  onChange={(e) => handleChange('product_name', e.target.value)}
                  placeholder="제품명"
                  aria-label="제품명"
                />
              </WishFieldRow>

              {!hidePrice ? (
                <WishFieldRow label="가격">
                  <Input
                    type="number"
                    inputMode="numeric"
                    placeholder="예: 28000"
                    value={formData.price || ''}
                    onChange={(e) => handleChange('price', e.target.value)}
                    className="text-[var(--brand-pink)] placeholder:text-zinc-300"
                    aria-label="가격"
                  />
                </WishFieldRow>
              ) : null}

              <div className="flex items-start gap-2">
                <div className="min-w-0 flex-1">
                  <WishFieldLabel>분류</WishFieldLabel>
                  <div className="grid grid-cols-2 gap-2">
                    <Select
                      value={formData.main_category}
                      onValueChange={handleMainChange}
                    >
                      <SelectTrigger
                        className="h-8 w-full min-w-0 rounded-lg border-zinc-200 bg-white"
                        aria-label="대분류"
                      >
                        <SelectValue placeholder="대분류" />
                      </SelectTrigger>
                      <SelectContent>
                        {COSMETIC_CATEGORIES.map((c) => (
                          <SelectItem key={c.value} value={c.value}>
                            {c.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Select
                      value={formData.sub_category}
                      onValueChange={(value) =>
                        handleChange('sub_category', value)
                      }
                      disabled={
                        !formData.main_category ||
                        formData.main_category === 'Etc'
                      }
                    >
                      <SelectTrigger
                        className={cn(
                          'h-8 w-full min-w-0 rounded-lg border-zinc-200 bg-white',
                          (!formData.main_category ||
                            formData.main_category === 'Etc') &&
                            'opacity-50',
                        )}
                        aria-label="소분류"
                      >
                        <SelectValue
                          placeholder={
                            formData.main_category
                              ? '소분류'
                              : '대분류를 먼저 선택해 주세요'
                          }
                        />
                      </SelectTrigger>
                      <SelectContent>
                        {subOptions.map((s) => (
                          <SelectItem key={s.value} value={s.value}>
                            {s.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <Image
                  src="/icons/PenNewSquare.svg"
                  alt=""
                  width={24}
                  height={24}
                  className="mt-9 shrink-0"
                  aria-hidden
                />
              </div>

              <WishFieldRow label="특징">
                <Input
                  value={formData.features || ''}
                  onChange={(e) => handleChange('features', e.target.value)}
                  placeholder="특징"
                  aria-label="특징"
                />
              </WishFieldRow>

              <div className="flex items-start gap-2">
                <div className="min-w-0 flex-1">
                  <WishFieldLabel>메모</WishFieldLabel>
                  <textarea
                    value={formData.memo || ''}
                    maxLength={MEMO_MAX_LEN}
                    onChange={(e) => handleChange('memo', e.target.value)}
                    placeholder="메모는 최대 60자까지 입력할 수 있습니다."
                    rows={4}
                    className="border-mono-gray focus-visible:border-brand-pink w-full resize-none rounded-sm border px-4 py-3 text-sm outline-none placeholder:text-zinc-400 focus-visible:ring-0"
                    aria-label="메모"
                  />
                  <p className="mt-1 text-xs text-zinc-400">
                    {String(formData.memo ?? '').length}/{MEMO_MAX_LEN}
                  </p>
                </div>
                <Image
                  src="/icons/PenNewSquare.svg"
                  alt=""
                  width={24}
                  height={24}
                  className="mt-9 shrink-0"
                  aria-hidden
                />
              </div>

              <div>
                <WishFieldLabel>원본 사진</WishFieldLabel>
                <button
                  type="button"
                  onClick={() => setShowCapture(true)}
                  className="relative aspect-square w-28 overflow-hidden rounded-xl border border-zinc-200 bg-zinc-50"
                >
                  <WishCapturePreviewImage previewSrc={capturePreviewSrc} />
                </button>
                {!disableManualImageUpload ? (
                  <>
                    <input
                      type="file"
                      ref={fileInputRef}
                      onChange={handleFileChange}
                      accept="image/*"
                      className="hidden"
                    />
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="mt-2 text-sm font-semibold text-[var(--brand-pink)]"
                    >
                      사진 변경
                    </button>
                  </>
                ) : null}
              </div>
            </div>
          )}

          {!isDirectRegisterLayout && !hideYoutubeReview ? (
            <section className="mt-10 border-t border-zinc-100 pt-6">
              <WishFieldLabel>연관 리뷰 영상</WishFieldLabel>

              {isYoutubeLoading ? (
                <Carousel
                  opts={{
                    align: 'start',
                    containScroll: 'trimSnaps',
                  }}
                  className="w-full"
                >
                  <CarouselContent className="-ml-4">
                    {[1, 2, 3].map((n) => (
                      <CarouselItem key={n} className="basis-[38%] pl-4">
                        <div className="h-40 w-full animate-pulse rounded-xl bg-zinc-100" />
                        <div className="mt-2 h-4 w-3/4 animate-pulse rounded bg-zinc-100" />
                      </CarouselItem>
                    ))}
                  </CarouselContent>
                </Carousel>
              ) : youtubeData?.items && youtubeData.items.length > 0 ? (
                <Carousel
                  opts={{
                    align: 'start',
                    containScroll: 'trimSnaps',
                  }}
                  className="w-full"
                >
                  <CarouselContent className="-ml-4">
                    {youtubeData.items.map((video) => (
                      <CarouselItem
                        key={video.id.videoId}
                        className="basis-[38%] pl-4"
                      >
                        <a
                          href={`https://www.youtube.com/watch?v=${video.id.videoId}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="group block"
                        >
                          <div className="relative aspect-video w-full overflow-hidden rounded-xl">
                            <Image
                              src={video.snippet.thumbnails.high.url}
                              alt={video.snippet.title}
                              fill
                              className="object-cover"
                            />
                          </div>
                          <p className="mt-2 line-clamp-2 text-sm font-semibold text-zinc-900">
                            {video.snippet.title}
                          </p>
                          <p className="text-xs text-zinc-400">
                            {video.snippet.channelTitle}
                          </p>
                        </a>
                      </CarouselItem>
                    ))}
                  </CarouselContent>
                </Carousel>
              ) : (
                <p className="text-sm text-[var(--mono-dark-gray)]">
                  연관 리뷰 영상을 찾을 수 없어요.
                </p>
              )}
            </section>
          ) : null}
        </div>
      </div>

      <div className="pointer-events-none fixed right-[20px] bottom-20 left-[20px] z-40 flex justify-center">
        <div
          className={cn(
            'pointer-events-auto w-full',
            isDirectRegisterLayout ? 'max-w-[440px]' : 'max-w-120',
          )}
        >
          <button
            type="button"
            onClick={() => void handleSaveClick()}
            disabled={isSubmitting || isImageProcessing}
            className={cn(
              'h-12 w-full transition-opacity disabled:opacity-60',
              isScanEditLayout || isDirectRegisterLayout
                ? 'h-14 rounded-full bg-[#FF93DB] text-base font-bold text-[#161618] shadow-none'
                : 'rounded-2xl bg-[var(--brand-pink)] text-base font-bold text-white shadow-[0_8px_24px_rgba(255,96,202,0.35)]',
            )}
          >
            {isSubmitting ? '저장 중...' : submitLabel}
          </button>
        </div>
      </div>

      {showCapture ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 p-5">
          <button
            type="button"
            onClick={() => setShowCapture(false)}
            className="absolute top-6 right-6 z-10 text-white"
            aria-label="닫기"
          >
            <X size={32} />
          </button>

          <div className="relative aspect-1/2 w-full max-w-[480px]">
            <WishCapturePreviewImage
              previewSrc={capturePreviewSrc}
              alt="원본 캡처 화면"
              variant="modal"
            />
          </div>

          <div className="absolute bottom-10 flex gap-6">
            <button
              type="button"
              onClick={() => void handleCaptureShare()}
              className="flex flex-col items-center gap-2 text-white"
            >
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-black">
                <Share2 size={20} />
              </div>
              <span className="text-xs">공유하기</span>
            </button>
            <button
              type="button"
              onClick={() => void handleCaptureDownload()}
              className="flex flex-col items-center gap-2 text-white"
            >
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-black">
                <Download size={20} />
              </div>
              <span className="text-xs">저장하기</span>
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
