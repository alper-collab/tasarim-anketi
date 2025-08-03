
// This script is designed to run after the main document and ALL resources (including theme scripts) are loaded.
window.addEventListener('load', () => {
  try {
    // Check if React and ReactDOM have been loaded from the CDN
    if (typeof React === 'undefined' || typeof ReactDOM === 'undefined') {
      throw new Error("HATA: React veya ReactDOM kütüphaneleri yüklenemedi. Anket başlatılamıyor.");
    }

    const { useState, useMemo, useCallback, createElement, Fragment } = React;
    const { createRoot } = ReactDOM;

    // SORUN GİDERME İÇİN BASİTLEŞTİRİLDİ: Sadece 2 soru aktif.
    const questions = [{
        id: 'email',
        text: 'Projenizle ilgili size ulaşabilmemiz için e-posta adresiniz',
        type: 'email',
        required: true,
        layout: 'horizontal'
    }, {
        id: 'notes',
        text: 'İç mimarımıza iletmek istediğin bir notun var mı?',
        type: 'textarea',
        required: true,
        layout: 'horizontal',
        placeholder: 'Cevabınızı buraya yazın...'
    }];
    
    const WelcomeScreen = ({
        onStart
    }) => createElement("div", {
        className: "survey-container animate-fade-in welcome-view"
    }, createElement("div", {
        className: "welcome-content"
    }, createElement("h2", {
        className: "welcome-title"
    }, "Tasarım Yolculuğunuz Başlıyor"), createElement("p", {
        className: "welcome-subtitle"
    }, "Stilinizi ve ihtiyaçlarınızı anlamamıza yardımcı olacak bu anketi doldurarak hayalinizdeki mekana bir adım daha yaklaşın."), createElement("button", {
        onClick: onStart,
        className: "start-button"
    }, "Ankete Başla")));

    const App = () => {
        const [answers, setAnswers] = useState(() => {
            const rootEl = document.getElementById('root');
            const email = rootEl ? rootEl.dataset.customerEmail : null;
            return email ? { email: email } : {};
        });
        const [currentStep, setCurrentStep] = useState(0);
        const [view, setView] = useState('welcome');
        const [isSubmitting, setIsSubmitting] = useState(false);
        const [submitError, setSubmitError] = useState(null);
        
        const currentQuestion = questions[currentStep];
        const totalQuestions = questions.length;

        const handleAnswerChange = useCallback((questionId, value) => {
            setAnswers(prev => ({ ...prev, [questionId]: value }));
        }, []);

        const isNextDisabled = useMemo(() => {
            if (!currentQuestion || !currentQuestion.required) return false;
            const answer = answers[currentQuestion.id];
            
            if (currentQuestion.type === 'email') {
                const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
                return !(answer && emailRegex.test(answer));
            }
            if (currentQuestion.type === 'textarea') {
                return !answer || answer.trim() === '';
            }
            return !answer || (typeof answer === 'string' && answer.trim() === '');
        }, [answers, currentQuestion]);

        const handleSubmit = async () => {
            setIsSubmitting(true);
            setSubmitError(null);
            const API_ENDPOINT = 'https://tasarim-anketi.vercel.app/api/send-email';
            
            const submissionDataForEmail = {};
            const userEmail = answers['email'] || 'E-posta belirtilmedi';
            
            questions.forEach(q => {
                 const answer = answers[q.id];
                 if (answer === undefined || answer === null || (typeof answer === 'string' && answer.trim() === '')) {
                    submissionDataForEmail[q.text] = "Cevaplanmadı";
                } else {
                    submissionDataForEmail[q.text] = answer;
                }
            });
            
            const payload = {
                subject: `Yeni Tasarım Keşif Anketi: ${userEmail}`,
                replyTo: userEmail,
                answers: submissionDataForEmail
            };

            try {
                const response = await fetch(API_ENDPOINT, {
                    method: 'POST',
                    headers: {
                      'Content-Type': 'application/json',
                    },
                    body: JSON.stringify(payload),
                    credentials: 'include', // CORS kimlik bilgileri için gerekli
                });

                if (response.ok) {
                    setView('submitted');
                } else {
                    let errorData;
                    try {
                        errorData = await response.json();
                    } catch (jsonError) {
                        throw new Error(`HTTP Hata Kodu: ${response.status} - ${response.statusText || 'Bilinmeyen bir sunucu hatası.'}`);
                    }
                    const errorMessage = errorData?.error || 'Bilinmeyen bir hata oluştu. Lütfen tekrar deneyin.';
                    throw new Error(errorMessage);
                }
            } catch (error) {
                console.error("Fetch Error:", error);
                setSubmitError(`Gönderim başarısız oldu: ${error.message}. Lütfen ağ bağlantınızı kontrol edin ve tekrar deneyin. Sorun devam ederse, site yöneticisiyle iletişime geçin.`);
            } finally {
                setIsSubmitting(false);
            }
        };

        const handleNext = async () => {
            if (currentStep < totalQuestions - 1) {
                setCurrentStep(prev => prev + 1);
            } else {
                await handleSubmit();
            }
        };
        const handlePrev = () => {
            if (currentStep > 0) {
                setCurrentStep(prev => prev - 1);
            }
        };
        const handleStart = () => {
            setView('survey');
        };

        const renderQuestion = () => {
            const { id, type, placeholder } = currentQuestion;
            const value = answers[id];

            switch (type) {
                case 'email':
                    return createElement("input", {
                        type: "email", id, name: id, className: "text-input",
                        value: value || '', onChange: (e) => handleAnswerChange(id, e.target.value),
                        placeholder: "example@example.com", autoComplete: "email"
                    });
                case 'textarea':
                    return createElement("textarea", {
                        id, name: id, className: "text-input", value: value || '',
                        onChange: (e) => handleAnswerChange(id, e.target.value),
                        placeholder: placeholder || "Cevabınızı buraya yazın...", autoComplete: "off"
                    });
                default:
                    return null;
            }
        };

        if (view === 'welcome') {
            return createElement(WelcomeScreen, { onStart: handleStart });
        }
        if (view === 'submitted') {
            return createElement("div", { className: "survey-container" },
                createElement("div", { className: "thank-you-container" },
                    createElement("h2", null, "Teşekkür ederiz!"),
                    createElement("p", null, "Tasarım yolculuğunuza bizimle başladığınız için heyecanlıyız. En kısa sürede sizinle iletişime geçeceğiz.")
                )
            );
        }
        
        const questionLayoutClass = `question-layout-${currentQuestion.layout || 'vertical'}`;
        return createElement("div", { className: "survey-container" },
            createElement("div", { className: "progress-container" },
                createElement("div", { className: "progress-info" },
                    createElement("span", null, "Adım ", currentStep + 1, " / ", totalQuestions)
                ),
                createElement("div", { className: "progress-bar" },
                    createElement("div", { className: "progress-bar-fill", style: { width: `${((currentStep + 1) / totalQuestions) * 100}%` } })
                )
            ),
            createElement("div", { className: "question-body" },
                createElement("div", { className: questionLayoutClass },
                    createElement("p", { className: "question-text" },
                        currentQuestion.text,
                        currentQuestion.required && createElement("span", { className: "required-star" }, "*")
                    ),
                    createElement("div", { className: "question-content" }, renderQuestion())
                )
            ),
            createElement("div", { className: "navigation-buttons" },
                createElement("div", { className: "nav-button-container" },
                    createElement("button", {
                        className: `nav-button nav-prev ${currentStep === 0 ? 'hidden' : ''}`,
                        onClick: handlePrev,
                        disabled: isSubmitting
                    }, "ÖNCEKİ"),
                    createElement("button", {
                        className: "nav-button nav-next",
                        onClick: handleNext,
                        disabled: isNextDisabled || isSubmitting
                    }, isSubmitting ? 'GÖNDERİLİYOR...' : (currentStep === totalQuestions - 1 ? 'GÖNDER' : 'SONRAKİ'))
                ),
                submitError && createElement("p", { className: "submit-error" }, submitError)
            )
        );
    };

    const container = document.getElementById('root');
    const root = createRoot(container);
    root.render(createElement(App));

  } catch (error) {
    console.error('Survey App Initialization Error:', error);
    const rootEl = document.getElementById('root');
    if (rootEl) {
      rootEl.innerHTML = `<div style="padding: 2rem; text-align: center; color: #ef4444; font-family: sans-serif;">HATA: ${error.message} Anket yüklenirken kritik bir hata oluştu. Lütfen site yöneticisiyle iletişime geçin.</div>`;
    }
  }
});
