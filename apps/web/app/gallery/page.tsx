// apps/web/app/gallery/page.tsx
export default function Gallery() {
  return (
    <div className="p-8">
      <h1 className="text-4xl font-bold mb-6">Inspiration Gallery</h1>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* We will map your Azure images here next */}
        <div className="aspect-square bg-gray-200 rounded-lg animate-pulse" />
        <div className="aspect-square bg-gray-200 rounded-lg animate-pulse" />
        <div className="aspect-square bg-gray-200 rounded-lg animate-pulse" />
      </div>
    </div>
  );
}