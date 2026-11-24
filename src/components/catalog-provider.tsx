"use client";

import { createContext, use } from "react";
import { DEFAULT_CATALOG, type Catalog } from "@/lib/catalog";

// The live catalog (prices edited in /admin/catalog) handed down from the server layout to client components.
const Ctx = createContext<Catalog>(DEFAULT_CATALOG);
export const CatalogProvider = ({ value, children }: { value: Catalog; children: React.ReactNode }) => <Ctx value={value}>{children}</Ctx>;
export const useCatalog = () => use(Ctx);
