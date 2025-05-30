// src/app/test/page.tsx

export default function TestPage() {
    return (
        <div className="bg-background text-foreground p-8 border-4 border-border">
            <h1 className="text-4xl font-bold mb-4">Тест Tailwind v4</h1>

            <div className="bg-custom p-4 mb-4">
                 Фон (должен быть красным)
            </div>

            <div className="text-custom p-4 mb-4">
                Текст (должен быть жёлтым)
            </div>

            <div className="border-custom p-4 border-2">
                Граница (должна быть синей)
            </div>

            <div className="bg-custom-50 test-forced-text p-4 mt-4">
                Полупрозрачный фон (должен быть розовым)
            </div>

            <div className="bg-[rgba(var(--background),0.2)] p-4 mt-4">20% прозрачности</div>
        </div>
    )
}