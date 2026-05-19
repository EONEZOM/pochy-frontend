'use client';

import { useMemo } from 'react';

import type { Detail, MyCosmeticsResponseDTO, ReadListDto } from '@/api/model';
import {
  collectHomeSectionImageUrls,
  collectMyCosmeticsItemUrls,
  collectPouchListDisplayUrls,
  collectPouchShareDisplayUrls,
  collectWishCarouselUrls,
  collectWishListDisplayUrls,
  resolvePrefetchImageSrc,
} from '@/lib/collect-route-image-urls';
import { useWarmQueryImages } from '@/hooks/useWarmQueryImages';

export const useWarmHomeSectionImages = (
  sections: ReadonlyArray<{ items: Detail[] }>,
): void => {
  const urls = useMemo(
    () => collectHomeSectionImageUrls(sections),
    [sections],
  );
  useWarmQueryImages(urls);
};

export const useWarmWishListImages = (
  items: ReadonlyArray<{
    official_image?: string | null;
    capture_image?: string | null;
  }>,
): void => {
  const urls = useMemo(() => collectWishListDisplayUrls(items), [items]);
  useWarmQueryImages(urls);
};

export const useWarmWishCarouselImages = (wishItems: ReadListDto[]): void => {
  const urls = useMemo(() => collectWishCarouselUrls(wishItems), [wishItems]);
  useWarmQueryImages(urls);
};

export const useWarmMyCosmeticsItems = (
  items: MyCosmeticsResponseDTO[],
): void => {
  const urls = useMemo(() => collectMyCosmeticsItemUrls(items), [items]);
  useWarmQueryImages(urls);
};

export const useWarmPouchListImages = (
  pouches: ReadonlyArray<{ imageUrl?: string | null }>,
): void => {
  const urls = useMemo(() => collectPouchListDisplayUrls(pouches), [pouches]);
  useWarmQueryImages(urls);
};

export const useWarmPouchShareImages = (
  displayImageUrl: string | null | undefined,
  displayRows: ReadonlyArray<{ imageSrc?: string | null }>,
): void => {
  const urls = useMemo(
    () => collectPouchShareDisplayUrls(displayImageUrl, displayRows),
    [displayImageUrl, displayRows],
  );
  useWarmQueryImages(urls);
};

export const useWarmProfileImage = (
  profileImageUrl: string | undefined,
): void => {
  const urls = useMemo(() => {
    const resolved = resolvePrefetchImageSrc(profileImageUrl);
    return resolved ? [resolved] : [];
  }, [profileImageUrl]);
  useWarmQueryImages(urls);
};
