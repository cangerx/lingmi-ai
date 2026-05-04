"use client";

import { useEffect } from "react";
import { useAuthStore } from "@/store/auth";
import { useLoginModalStore } from "@/store/login-modal";

export function useAuthGuard() {
  const { user, token, isLoading, fetchProfile } = useAuthStore();
  const openLoginModal = useLoginModalStore((s) => s.openLoginModal);

  useEffect(() => {
    if (!token) {
      openLoginModal();
      return;
    }
    if (!user && !isLoading) {
      fetchProfile();
    }
  }, [token, user, isLoading, fetchProfile, openLoginModal]);

  return { user, isLoading, isAuthenticated: !!token && !!user };
}
