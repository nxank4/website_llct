import Image from "next/image";

export default function Footer() {
  return (
    <footer className="relative text-white bg-[#0f4b82]">
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute -top-10 -left-20 w-60 h-60 bg-white/10 rounded-full blur-3xl" />
        <div className="absolute top-10 right-0 w-72 h-72 bg-[#00cbb8]/15 rounded-full blur-3xl" />
        <div className="absolute bottom-0 inset-x-0 h-24 bg-gradient-to-t from-black/20 to-transparent" />
      </div>

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-14 md:py-16">
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
              />
            </div>
            <div className="hidden sm:block w-px h-16 md:h-20 bg-white/30" />
            <div className="text-white">
              <div className="text-2xl md:text-[24px] leading-[1.4] poppins-bold">
                Soft Skill Department
              </div>
              <div className="text-white/90 text-lg md:text-[20px] arimo-regular">
                Trường ĐH FPT
              </div>
            </div>
          </div>
        </div>

        <div className="text-center mb-10 md:mb-12">
          <p className="text-lg md:text-[20px] text-white/90 font-medium poppins-medium">
            Nếu bạn có thắc mắc hay cần giúp đỡ, liên hệ ngay
          </p>
          <div className="mx-auto mt-4 h-px w-28 bg-white/30" />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 md:gap-8 mb-10 md:mb-12">
          <div className="bg-white/5 border border-white/10 rounded-2xl p-5 md:p-6">
            <div className="text-white text-lg md:text-[20px] leading-[1.6]">
              <div className="font-semibold mb-2 poppins-semibold">
                Văn phòng Bộ môn Kỹ năng mềm
              </div>
              <div className="text-white/90 arimo-regular">Địa chỉ:</div>
              <div className="text-white/90 arimo-regular">
                Email: vanbinh@fpt.edu.vn
              </div>
              <div className="text-white/90 arimo-regular">
                Zalo: 090.xxx.xxx
              </div>
            </div>
          </div>

          <div className="bg-white/5 border border-white/10 rounded-2xl p-5 md:p-6">
            <div className="text-white text-lg md:text-[20px] leading-[1.6]">
              <div className="font-semibold mb-2 poppins-semibold">
                Thầy Văn Bình
              </div>
              <div className="text-white/90 arimo-regular">Chức vụ:</div>
              <div className="text-white/90 arimo-regular">
                Email: vanbinh@fpt.edu.vn
              </div>
              <div className="text-white/90 arimo-regular">
                Zalo: 090.xxx.xxx
              </div>
            </div>
          </div>

          <div className="bg-white/5 border border-white/10 rounded-2xl p-5 md:p-6">
            <div className="text-white text-lg md:text-[20px] leading-[1.6]">
              <div className="font-semibold mb-2 poppins-semibold">
                Thầy Văn Bình
              </div>
              <div className="text-white/90 arimo-regular">Chức vụ</div>
              <div className="text-white/90 arimo-regular">
                Email: vanbinh@fpt.edu.vn
              </div>
              <div className="text-white/90 arimo-regular">
                Zalo: 090.xxx.xxx
              </div>
            </div>
          </div>
        </div>

        <div className="pt-6 md:pt-8 border-t border-white/15 text-center">
          <p className="text-base md:text-[18px] leading-[1.7] text-white/80 poppins-medium">
            Soft Skills Department | Trường Đại học FPT
          </p>
        </div>
      </div>
    </footer>
  );
}
