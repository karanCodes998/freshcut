import { useNavigate } from 'react-router-dom';

export default function Help() {
  const navigate = useNavigate();

  return (
    <div className="min-h-[calc(100vh-64px)] bg-gradient-to-br from-blue-50 via-white to-indigo-50 p-4 md:p-8 flex items-center justify-center">
      <div className="max-w-2xl w-full">
        {/* Support Card */}
        <div className="bg-white rounded-[2.5rem] shadow-2xl shadow-blue-100/50 border border-white p-8 md:p-12 relative overflow-hidden">
          {/* Decorative background elements */}
          <div className="absolute -top-24 -right-24 w-64 h-64 bg-blue-100 rounded-full opacity-20 blur-3xl"></div>
          <div className="absolute -bottom-24 -left-24 w-64 h-64 bg-indigo-100 rounded-full opacity-20 blur-3xl"></div>

          <div className="relative z-10">
            <div className="text-center mb-10">
              <div className="inline-flex items-center justify-center w-20 h-20 bg-blue-600 text-white text-4xl rounded-3xl shadow-lg shadow-blue-200 mb-6 animate-bounce-slow">
                🤝
              </div>
              <h1 className="text-4xl font-black text-gray-900 mb-4 tracking-tight">Need a hand?</h1>
              <p className="text-gray-500 text-lg leading-relaxed max-w-md mx-auto">
                Our support team is here to ensure your experience with <span className="font-bold text-blue-600">FreshCut</span> is as smooth as possible. We're just a message away!
              </p>
            </div>

            <div className="grid gap-6">
              {/* Phone Card */}
              <div className="bg-gray-50 rounded-3xl p-6 border border-gray-100 hover:border-blue-200 transition-all hover:shadow-md group">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center text-2xl shadow-sm group-hover:bg-blue-600 group-hover:text-white transition-all">
                    📱
                  </div>
                  <div>
                    <div className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-1">Call or WhatsApp</div>
                    <div className="text-lg font-black text-gray-800 space-y-1">
                      <div><a href="tel:9801182652" className="hover:text-blue-600 transition-colors">9801182652</a></div>
                      <div className="text-gray-300 font-normal text-sm">or</div>
                      <div><a href="tel:9905907981" className="hover:text-blue-600 transition-colors">9905907981</a></div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Email Card */}
              <div className="bg-gray-50 rounded-3xl p-6 border border-gray-100 hover:border-blue-200 transition-all hover:shadow-md group">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center text-2xl shadow-sm group-hover:bg-blue-600 group-hover:text-white transition-all">
                    ✉️
                  </div>
                  <div>
                    <div className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-1">Email Us</div>
                    <div className="text-lg font-black text-gray-800">
                      <a href="mailto:aster990590@gmail.com" className="hover:text-blue-600 transition-colors break-all">
                        aster990590@gmail.com
                      </a>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-12 text-center">
              <button 
                onClick={() => navigate(-1)}
                className="inline-flex items-center gap-2 text-gray-400 font-bold hover:text-gray-900 transition-all hover:gap-3"
              >
                ← Go back to Dashboard
              </button>
            </div>
          </div>
        </div>

        {/* Footer Note */}
        <p className="text-center text-gray-400 text-xs mt-8 font-medium">
          Available 9:00 AM - 9:00 PM · Dedicated to your Satisfaction
        </p>
      </div>
    </div>
  );
}
