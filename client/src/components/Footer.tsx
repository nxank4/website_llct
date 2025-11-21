import Image from "next/image";
import { useEffect, useState } from "react";
import { useThemePreference } from "@/providers/ThemeProvider";
import { cn } from "@/lib/utils";
import { handleImageError } from "@/lib/imageFallback";

export default function Footer() {
  const { theme } = useThemePreference();
  const [isMounted, setIsMounted] = useState(false);
  const isDarkMode = theme === "dark";
  const resolvedDarkMode = isMounted ? isDarkMode : false;

  useEffect(() => {
    setIsMounted(true);
  }, []);

  return (
    <footer
      className={cn(
        "relative overflow-hidden transition-colors",
        resolvedDarkMode
          ? "bg-background text-foreground"
          : "bg-[hsl(var(--primary))] text-primary-foreground"
      )}
    >
      <div className="absolute inset-0 pointer-events-none">
        <div
          className={cn(
            "absolute -top-10 -left-20 w-60 h-60 rounded-full blur-3xl",
            resolvedDarkMode ? "bg-primary/10" : "bg-primary-foreground/15"
          )}
        />
        <div
          className={cn(
            "absolute top-10 right-0 w-72 h-72 rounded-full blur-3xl",
            resolvedDarkMode ? "bg-emerald-400/20" : "bg-emerald-400/30"
          )}
        />
        <div
          className={cn(
            "absolute bottom-0 inset-x-0 h-24 bg-gradient-to-t",
            resolvedDarkMode
            ? "from-background/80 to-transparent"
            : "from-black/20 to-transparent"
          )}
        />
      </div>

      <div className="relative max-w-7.5xl mx-auto px-4 sm:px-6 lg:px-8 py-14 md:py-16">
        <div className="flex items-center justify-center mb-12 md:mb-16">
          <div className="flex items-center gap-8 md:gap-12">
            <div className="shrink-0">
              <Image
                src="/logo-white.png"
                alt="Logo"
                width={112}
                height={112}
                className="w-24 h-24 md:w-28 md:h-28 object-contain"
                unoptimized
                onError={(event) => handleImageError(event, 112, 112, "Logo")}
              />
            </div>
            <div
              className={cn(
                "hidden sm:block w-px h-16 md:h-20",
                resolvedDarkMode ? "bg-border" : "bg-primary-foreground/30"
              )}
            />
            <div>
              <div className="text-2xl md:text-[24px] leading-[1.4] poppins-bold">
                Soft Skill Department
              </div>
              <div
                className={cn(
                  "text-lg md:text-[20px] arimo-regular",
                  resolvedDarkMode
                    ? "text-muted-foreground"
                    : "text-primary-foreground/90"
                )}
              >
                Trường ĐH FPT
              </div>
            </div>
          </div>
        </div>

        <div className="text-center mb-10 md:mb-12">
          <p
            className={cn(
              "text-lg md:text-[20px] font-medium poppins-medium",
              resolvedDarkMode
                ? "text-muted-foreground"
                : "text-primary-foreground/90"
            )}
          >
            Nếu bạn có thắc mắc hay cần giúp đỡ, liên hệ ngay
          </p>
          <div
            className={cn(
              "mx-auto mt-4 h-px w-28",
              resolvedDarkMode ? "bg-border" : "bg-primary-foreground/30"
            )}
          />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 lg:gap-8 mb-10 lg:mb-12">
          {[
            {
              title: "Văn phòng Bộ môn Kỹ năng mềm",
              subtitle: "Địa chỉ:",
              emailLabel: "Email: vanbinh@fpt.edu.vn",
              zaloLabel: "Zalo: 090.xxx.xxx",
            },
            {
              title: "Thầy Văn Bình",
              subtitle: "Chức vụ:",
              emailLabel: "Email: vanbinh@fpt.edu.vn",
              zaloLabel: "Zalo: 090.xxx.xxx",
            },
            {
              title: "Thầy Văn Bình",
              subtitle: "Chức vụ",
              emailLabel: "Email: vanbinh@fpt.edu.vn",
              zaloLabel: "Zalo: 090.xxx.xxx",
            },
          ].map((card, index) => (
            <div
              key={`${card.title}-${index}`}
              className={cn(
                "rounded-2xl p-5 md:p-6 backdrop-blur transition-colors",
                resolvedDarkMode
                  ? "border border-border bg-card/70 text-card-foreground"
                  : "border border-white/15 bg-white/5 text-primary-foreground"
              )}
            >
              <div className="text-lg md:text-[20px] leading-[1.6] space-y-1.5">
                <div
                  className={cn(
                    "font-semibold mb-2 poppins-semibold",
                    resolvedDarkMode ? "text-foreground" : "text-primary-foreground"
                  )}
                >
                  {card.title}
                </div>
                <div
                  className={cn(
                    "arimo-regular",
                    resolvedDarkMode
                      ? "text-muted-foreground"
                      : "text-primary-foreground/80"
                  )}
                >
                  {card.subtitle}
                </div>
                <div
                  className={cn(
                    "arimo-regular",
                    resolvedDarkMode
                      ? "text-muted-foreground"
                      : "text-primary-foreground/80"
                  )}
                >
                  {card.emailLabel}
                </div>
                <div
                  className={cn(
                    "arimo-regular",
                    resolvedDarkMode
                      ? "text-muted-foreground"
                      : "text-primary-foreground/80"
                  )}
                >
                  {card.zaloLabel}
                </div>
              </div>
            </div>
          ))}
        </div>

        <div
          className={cn(
            "pt-6 md:pt-8 border-t text-center",
            resolvedDarkMode ? "border-border" : "border-primary-foreground/20"
          )}
        >
          <p
            className={cn(
              "text-base md:text-[18px] leading-[1.7] poppins-medium",
              resolvedDarkMode
                ? "text-muted-foreground"
                : "text-primary-foreground/80"
            )}
          >
            Soft Skills Department | Trường Đại học FPT
          </p>
        </div>
      </div>
    </footer>
  );
}
