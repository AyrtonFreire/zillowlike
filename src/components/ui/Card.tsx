import React from "react";

export function Card({ className = "", ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div {...props} className={`rounded-2xl border border-neutral-200/90 bg-white shadow-sm shadow-black/5 ${className}`} />
  );
}

export function CardBody({ className = "", ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div {...props} className={`p-5 md:p-6 ${className}`} />;
}

export function CardHeader({ className = "", ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div {...props} className={`border-b border-neutral-100 p-5 md:p-6 ${className}`} />;
}

export default Card;
