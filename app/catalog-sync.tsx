"use client";
import { useEffect } from "react";
import { capivaraPublic } from "../lib/capivara-supabase";

export default function CatalogSync(){
  useEffect(()=>{
    let active=true;
    const syncProducts=async()=>{
      try{
        const rows=await capivaraPublic("products?select=id,name,detail,category,price,badge,image,is_alcoholic,active&active=eq.true&order=id.asc");
        if(!active||!Array.isArray(rows))return;
        const products=rows.map((item)=>({
          id:Number(item.id),
          name:String(item.name),
          detail:String(item.detail||""),
          category:String(item.category),
          price:Number(item.price),
          badge:item.badge?String(item.badge):undefined,
          image:String(item.image||"/capivara-beer-mascot.webp"),
          isAlcoholic:Boolean(item.is_alcoholic),
          active:Boolean(item.active)
        }));
        localStorage.setItem("capivara-admin-products-v1",JSON.stringify(products));
        window.dispatchEvent(new Event("capivara-admin-change"));
      }catch{}
    };
    void syncProducts();
    const onFocus=()=>void syncProducts();
    window.addEventListener("focus",onFocus);
    const timer=window.setInterval(syncProducts,30000);
    return()=>{active=false;window.removeEventListener("focus",onFocus);window.clearInterval(timer)};
  },[]);
  return null;
}