import { ReactNode } from "react";
import { Sparkles } from "lucide-react";
import DecorativeShape from "./DecorativeShape";

interface HeroBaseProps {
	badgeText: string;
	title: string;
	subtitle: string;
	description?: string;
	children?: ReactNode;
}

const HeroBase = ({
	badgeText,
	title,
	subtitle,
	description,
	children,
}: HeroBaseProps) => {
	return (
		<section className="relative min-h-screen flex items-center justify-center overflow-hidden">
			{/* Decorative Shapes */}
			<DecorativeShape
				position="top-right"
				size="lg"
				opacity={0.15}
				rotation={90}
				zIndex={2}
			/>
			<DecorativeShape
				position="top-left"
				size="md"
				opacity={0.1}
				rotation={0}
				zIndex={2}
			/>

			{/* Background GIF */}
			<div
				className="absolute inset-0 bg-cover bg-center bg-no-repeat"
				style={{
					backgroundImage: "url('/landing-page/hero-image.gif')",
				}}
			/>

			{/* Dark Blue Overlay */}
			<div className="absolute inset-0 bg-[#1a1f3a]/70" />

			{/* Background Pattern */}
			<div className="absolute inset-0 opacity-5">
				<div
					className="absolute inset-0"
					style={{
						backgroundImage:
							"radial-gradient(circle at 2px 2px, white 1px, transparent 0)",
						backgroundSize: "40px 40px",
					}}
				/>
			</div>

			<div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-32 text-center">
				{/* Badge */}
				<div className="inline-flex items-center gap-2 px-4 py-2 bg-white/10 backdrop-blur-sm rounded-full border border-white/20 mb-8">
					<Sparkles size={16} className="text-[#ffb300]" />
					<span className="text-sm text-white font-medium">{badgeText}</span>
				</div>

				{/* Main Heading */}
				<h1 className="text-5xl sm:text-6xl lg:text-7xl font-bold text-white mb-6 leading-tight">
					{title}
				</h1>

				{/* Subheading */}
				<p className="text-xl sm:text-2xl text-gray-300 mb-4 max-w-4xl mx-auto font-light">
					{subtitle}
				</p>

				{description && (
					<p className="text-lg text-gray-400 mb-10 max-w-3xl mx-auto">
						{description}
					</p>
				)}

				{children}
			</div>
		</section>
	);
};

export default HeroBase;

