import { Linkedin } from "lucide-react";
import DecorativeShape from "../../landingPage/components/DecorativeShape";

interface TeamMember {
	name: string;
	role: string;
	image: string;
	linkedin?: string;
}

const AboutTeam = () => {
	const teamMembers: TeamMember[] = [
		{
			name: "Mohamed IBENBBA",
			role: "Product Manager",
			image: "/team/Mohamed IBENBBA.jpg",
			linkedin: "https://www.linkedin.com/in/mohamed-ibenbba/",
		},
		{
			name: "Mohammed El MAHFOUDI",
			role: "Back-End Engineer",
			image: "/team/Mohammed EL MAHFOUDI.jpeg",
			linkedin: "https://www.linkedin.com/in/mohammed-elmahfoudi-1b4b22247",
		},
		{
			name: "Sami AGOURRAM",
			role: "System Architect",
			image: "/team/Sami AGGOURAM.jpeg",
			linkedin: "https://www.linkedin.com/in/sami-agourram-cs/",
		},
		{
			name: "Yahya EI GATAA",
			role: "Full-Stack Engineer",
			image: "/team/Yahya EL Gataa.png",
			linkedin: "https://www.linkedin.com/in/yahya-el-gataa-523124213/",
		},
		{
			name: "Adam BOUKHARE",
			role: "UI/UX Designer",
			image: "/team/Adam Boukhare.jpeg",
			linkedin: "https://www.linkedin.com/in/adam-boukhare-business/",
		},
		{
			name: "Abdelmouttalib ACHHOUBI",
			role: "Full-Stack Engineer",
			image: "/team/Abdelmouttalib achhoubi.jpeg",
			linkedin: "https://www.linkedin.com/in/abdoachhoubi/",
		},
		{
			name: "Samar BENNOUNA",
			role: "Designer",
			image: "/team/Samar BENNOUNA.jpeg",
			linkedin: "https://www.linkedin.com/in/samar-bennouna-2005s/",
		},
		{
			name: "Yassine ED-DYB",
			role: "Front-End Engineer",
			image: "/team/Yassine ED_DYB.jpeg",
			linkedin: "https://www.linkedin.com/in/yassineeddyb/",
		},
		{
			name: "Younes MARBOU",
			role: "Coordination with the INF teams",
			image: "/team/Younes Marbou.jpg",
			linkedin: "https://www.linkedin.com/in/younes-marbou-73728a332",
		},
	];

	return (
		<section className="py-20 sm:py-28 lg:py-36 bg-gradient-to-b from-white via-gray-50/30 to-white relative overflow-hidden">
			{/* Decorative Shapes */}
			<DecorativeShape
				position="top-right"
				size="lg"
				opacity={0.03}
				rotation={90}
			/>
			<DecorativeShape
				position="bottom-left"
				size="md"
				opacity={0.02}
				rotation={0}
			/>

			<div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
				{/* Header */}
				<div className="text-center mb-16 sm:mb-20 lg:mb-24">
					<div className="inline-block mb-4">
						<span className="text-xs sm:text-sm font-semibold text-[#ffb300] uppercase tracking-[0.2em] letter-spacing-wide">
							Our Team
						</span>
					</div>
					<h2 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold text-gray-900 mb-5 sm:mb-6 tracking-tight leading-tight max-w-4xl mx-auto">
						Introducing the INF Platform 2.0 Team
					</h2>
					<div className="w-20 h-1 bg-gradient-to-r from-transparent via-[#ffb300] to-transparent mx-auto mb-6" />
					<p className="text-base sm:text-lg text-gray-600 max-w-2xl mx-auto leading-relaxed">
						The talented individuals behind the digital transformation of INF
					</p>
				</div>

				{/* Team Grid */}
				<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8 sm:gap-10 lg:gap-12">
					{teamMembers.map((member, index) => (
						<div
							key={index}
							className="group relative"
						>
							{/* Card Container */}
							<div className="bg-white rounded-2xl p-6 sm:p-8 shadow-sm border border-gray-100 hover:shadow-xl hover:border-[#ffb300]/20 transition-all duration-500 h-full flex flex-col items-center text-center">
								{/* Profile Image Container */}
								<div className="relative mb-6">
									<div className="relative">
										{/* Outer Glow */}
										<div className="absolute inset-0 rounded-full bg-gradient-to-br from-[#ffb300]/20 to-transparent opacity-0 group-hover:opacity-100 blur-xl transition-opacity duration-500" />
										
										{/* Image Frame */}
										<div className="relative w-36 h-36 sm:w-40 sm:h-40 lg:w-44 lg:h-44 mx-auto">
											<div className="absolute inset-0 rounded-full bg-gradient-to-br from-[#ffb300]/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
											<div className="relative w-full h-full rounded-full overflow-hidden ring-4 ring-gray-100 group-hover:ring-[#ffb300]/30 transition-all duration-500">
												<img
													src={member.image}
													alt={member.name}
													className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
												/>
											</div>
										</div>

										{/* LinkedIn Button */}
										{member.linkedin && (
											<a
												href={member.linkedin}
												target="_blank"
												rel="noopener noreferrer"
												className="absolute -bottom-2 -right-2 w-11 h-11 sm:w-12 sm:h-12 bg-white rounded-full flex items-center justify-center shadow-lg hover:shadow-xl hover:scale-110 active:scale-95 transition-all duration-300 border-2 border-gray-100 hover:border-[#0077b5] group/link"
												aria-label={`${member.name}'s LinkedIn profile`}
											>
												<Linkedin className="text-[#0077b5] group-hover/link:scale-110 transition-transform duration-300" size={20} />
											</a>
										)}
									</div>
								</div>

								{/* Member Info */}
								<div className="flex-1 space-y-2">
									<h3 className="text-xl sm:text-2xl font-bold text-gray-900 group-hover:text-[#ffb300] transition-colors duration-300">
										{member.name}
									</h3>
									<div className="inline-flex items-center px-4 py-1.5 bg-gray-50 rounded-full group-hover:bg-[#ffb300]/5 transition-colors duration-300">
										<p className="text-sm sm:text-base text-gray-600 font-medium">
											{member.role}
										</p>
									</div>
								</div>

								{/* Hover Accent Line */}
								<div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-[#ffb300] to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 rounded-b-2xl" />
							</div>
						</div>
					))}
				</div>
			</div>
		</section>
	);
};

export default AboutTeam;

