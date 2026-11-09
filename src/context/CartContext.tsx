import React, { createContext, useContext, useEffect, useState } from 'react';
import { SujetRecord } from '../types/cedoc';

const STORAGE_KEY = 'gcd_cedoc_cart_v1';
const MAX_CART_ITEMS = 3;

interface CartContextValue {
  cartItems: SujetRecord[];
  selectedSubjectIds: string[];
  maxCapacity: number;
  isCartFull: boolean;
  replacingSubject: SujetRecord | null;
  addToCart: (sujet: SujetRecord) => { success: boolean; message?: string };
  removeFromCart: (sujetId: string) => void;
  replaceInCart: (oldSujetId: string, newSujet: SujetRecord) => void;
  toggleSubjectSelection: (sujetId: string) => void;
  isSubjectInCart: (sujetId: string) => boolean;
  isSubjectSelected: (sujetId: string) => boolean;
  startReplacing: (sujet: SujetRecord) => void;
  cancelReplacing: () => void;
  clearCart: () => void;
  setCartFromExternal: (sujets: SujetRecord[]) => void;
}

const CartContext = createContext<CartContextValue | undefined>(undefined);

export const CartProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [cartItems, setCartItems] = useState<SujetRecord[]>(() => {
    // Purger tout résidu pour qu'au rafraîchissement de l'application aucun sujet n'ait "Dans le panier"
    try {
      localStorage.removeItem(STORAGE_KEY);
      sessionStorage.removeItem(STORAGE_KEY);
    } catch {
      // Fallback
    }
    return [];
  });

  const [selectedSubjectIds, setSelectedSubjectIds] = useState<string[]>([]);

  const [replacingSubject, setReplacingSubject] = useState<SujetRecord | null>(null);

  // Keep selectedSubjectIds in sync when items are removed
  useEffect(() => {
    const validIds = new Set(cartItems.map((it) => it.id));
    setSelectedSubjectIds((prev) => prev.filter((id) => validIds.has(id)));
  }, [cartItems]);

  const addToCart = (sujet: SujetRecord): { success: boolean; message?: string } => {
    // If we are in replacing mode
    if (replacingSubject) {
      replaceInCart(replacingSubject.id, sujet);
      setReplacingSubject(null);
      return { success: true };
    }

    if (cartItems.some((it) => it.id === sujet.id)) {
      return { success: false, message: 'Ce sujet est déjà présent dans votre panier.' };
    }

    if (cartItems.length >= MAX_CART_ITEMS) {
      return {
        success: false,
        message:
          'Limite stricte de 3 sujets atteinte. Veuillez supprimer ou remplacer un sujet existant pour en ajouter un nouveau.',
      };
    }

    setCartItems((prev) => [...prev, sujet]);
    setSelectedSubjectIds((prev) => [...prev, sujet.id]);
    return { success: true };
  };

  const removeFromCart = (sujetId: string) => {
    setCartItems((prev) => prev.filter((it) => it.id !== sujetId));
    setSelectedSubjectIds((prev) => prev.filter((id) => id !== sujetId));
    if (replacingSubject && replacingSubject.id === sujetId) {
      setReplacingSubject(null);
    }
  };

  const replaceInCart = (oldSujetId: string, newSujet: SujetRecord) => {
    setCartItems((prev) => {
      const idx = prev.findIndex((it) => it.id === oldSujetId);
      if (idx === -1) return prev;
      const copy = [...prev];
      copy[idx] = newSujet;
      return copy;
    });
    setSelectedSubjectIds((prev) => {
      const withoutOld = prev.filter((id) => id !== oldSujetId);
      return [...withoutOld, newSujet.id];
    });
    setReplacingSubject(null);
  };

  const toggleSubjectSelection = (sujetId: string) => {
    setSelectedSubjectIds((prev) => {
      if (prev.includes(sujetId)) {
        return prev.filter((id) => id !== sujetId);
      } else {
        return [...prev, sujetId];
      }
    });
  };

  const isSubjectInCart = (sujetId: string): boolean => {
    return cartItems.some((it) => it.id === sujetId);
  };

  const isSubjectSelected = (sujetId: string): boolean => {
    return selectedSubjectIds.includes(sujetId);
  };

  const startReplacing = (sujet: SujetRecord) => {
    setReplacingSubject(sujet);
  };

  const cancelReplacing = () => {
    setReplacingSubject(null);
  };

  const clearCart = () => {
    setCartItems([]);
    setSelectedSubjectIds([]);
    setReplacingSubject(null);
    try {
      localStorage.removeItem(STORAGE_KEY);
      sessionStorage.removeItem(STORAGE_KEY);
    } catch {
      // Ignore
    }
  };

  const setCartFromExternal = (sujets: SujetRecord[]) => {
    const limited = sujets.slice(0, MAX_CART_ITEMS);
    setCartItems(limited);
    setSelectedSubjectIds(limited.map((it) => it.id));
  };

  return (
    <CartContext.Provider
      value={{
        cartItems,
        selectedSubjectIds,
        maxCapacity: MAX_CART_ITEMS,
        isCartFull: cartItems.length >= MAX_CART_ITEMS,
        replacingSubject,
        addToCart,
        removeFromCart,
        replaceInCart,
        toggleSubjectSelection,
        isSubjectInCart,
        isSubjectSelected,
        startReplacing,
        cancelReplacing,
        clearCart,
        setCartFromExternal,
      }}
    >
      {children}
    </CartContext.Provider>
  );
};

export function useCart(): CartContextValue {
  const ctx = useContext(CartContext);
  if (!ctx) {
    throw new Error('useCart must be used within a CartProvider');
  }
  return ctx;
}
