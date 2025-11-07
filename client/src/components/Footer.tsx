import Image from "next/image";

export default function Footer() {
  return (
    <footer className="bg-[#125093] text-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        {/* Top Section - Logo and Department */}
        <div className="flex items-center justify-center mb-14">
          <div className="flex items-center space-x-12">
            {/* Logo */}
            <Image
              src="/logo-white.png"
              alt="Logo"
              width={112}
              height={112}
              className="w-28 h-28 object-contain"
            />

            {/* Vertical Line */}
            <div className="w-px h-20 bg-white opacity-30"></div>

            {/* Department Info */}
            <div className="text-white text-[24px] leading-[38.40px]">
              Soft Skill Department
              <br />
              Trường ĐH FPT
            </div>
          </div>
        </div>

        {/* Call to Action */}
        <div className="text-center mb-14">
          <p className="text-[24px] leading-[38.40px] text-white/90 font-medium">
            Nếu bạn có thắc mắc hay cần giúp đỡ, liên hệ ngay
          </p>
        </div>

        {/* Contact Information - 3 Columns */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-14">
          {/* Column 1 - Department Office */}
          <div className="text-white text-[20px] leading-[30px]">
            <div className="font-semibold mb-1">
              Văn phòng Bộ môn Kỹ năng mềm
            </div>
            <div className="text-white/90">Địa chỉ:</div>
            <div className="text-white/90">Email: vanbinh@fpt.edu.vn</div>
            <div className="text-white/90">Zalo: 090.xxx.xxx</div>
          </div>

          {/* Column 2 - Instructor 1 */}
          <div className="text-white text-[20px] leading-[30px]">
            <div className="font-semibold mb-1">Thầy Văn Bình</div>
            <div className="text-white/90">Chức vụ:</div>
            <div className="text-white/90">Email: vanbinh@fpt.edu.vn</div>
            <div className="text-white/90">Zalo: 090.xxx.xxx</div>
          </div>

          {/* Column 3 - Instructor 2 */}
          <div className="text-white text-[20px] leading-[30px]">
            <div className="font-semibold mb-1">Thầy Văn Bình</div>
            <div className="text-white/90">Chức vụ</div>
            <div className="text-white/90">Email: vanbinh@fpt.edu.vn</div>
            <div className="text-white/90">Zalo: 090.xxx.xxx</div>
          </div>
        </div>

        {/* Bottom Section - Copyright */}
        <div className="text-center">
          <p className="text-[24px] leading-[38.40px] text-white/80">
            Soft Skills Department | Trường Đại học FPT
          </p>
        </div>
      </div>
    </footer>
  );
}
