import dynamic from "next/dynamic";
const SoundQuizPage = dynamic(() => import("../../components/SoundQuiz"), {
  ssr: false,
});

export default SoundQuizPage;
