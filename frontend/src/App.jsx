import { useState, useRef } from 'react';
import { Upload, FileText, Briefcase, Zap, CheckCircle2, XCircle } from 'lucide-react';
import './index.css';

function App() {
  const [jdFile, setJdFile] = useState(null);
  const [resumeFile, setResumeFile] = useState(null);
  const [isDraggingJd, setIsDraggingJd] = useState(false);
  const [isDraggingResume, setIsDraggingResume] = useState(false);

  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);

  const jdInputRef = useRef(null);
  const resumeInputRef = useRef(null);

  const handleDragOver = (e, setDragging) => {
    e.preventDefault();
    setDragging(true);
  };

  const handleDragLeave = (e, setDragging) => {
    e.preventDefault();
    setDragging(false);
  };

  const handleDrop = (e, setFile, setDragging) => {
    e.preventDefault();
    setDragging(false);
    const file = e.dataTransfer.files[0];
    if (file && file.type === 'application/pdf') {
      setFile(file);
    } else {
      alert('Please upload a PDF file.');
    }
  };

  const handleFileChange = (e, setFile) => {
    const file = e.target.files[0];
    if (file && file.type === 'application/pdf') {
      setFile(file);
    } else {
      alert('Please upload a PDF file.');
    }
  };

  const handleAnalyze = async () => {
    if (!jdFile || !resumeFile) return;
    setLoading(true);
    setError(null);
    setResult(null);

    const formData = new FormData();
    formData.append('jdPdf', jdFile);
    formData.append('resumePdf', resumeFile);

    try {
      const response = await fetch('/api/evaluate', {
        method: 'POST',
        body: formData,
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Failed to analyze documents');
      }
      setResult(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const resetState = () => {
    setJdFile(null);
    setResumeFile(null);
    setResult(null);
    setError(null);
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-6">
      <div className="w-full max-w-4xl flex flex-col items-center gap-8">
        {/* Header */}
        <div className="text-center mb-2">
          <h1 className="text-5xl font-bold bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent tracking-tight mb-2">
            ResumeMatch AI
          </h1>
          <p className="text-slate-400 text-lg">
            AI-Powered Candidate Screening using DistilBERT &amp; Gemini
          </p>
        </div>

        {!result ? (
          <>
            {/* Upload Section */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 w-full">
              {/* JD Dropzone */}
              <div
                className={`
                  glass-border relative rounded-2xl p-10
                  flex flex-col items-center justify-center gap-4 text-center
                  cursor-pointer backdrop-blur-xl
                  border transition-all duration-300 ease-out
                  ${isDraggingJd
                    ? 'border-primary bg-primary/10'
                    : jdFile
                      ? 'border-secondary bg-bg-card hover:bg-bg-card-hover'
                      : 'border-white/10 bg-bg-card hover:bg-bg-card-hover hover:-translate-y-1 hover:shadow-2xl hover:shadow-black/30 hover:border-white/20'
                  }
                `}
                onDragOver={(e) => handleDragOver(e, setIsDraggingJd)}
                onDragLeave={(e) => handleDragLeave(e, setIsDraggingJd)}
                onDrop={(e) => handleDrop(e, setJdFile, setIsDraggingJd)}
                onClick={() => jdInputRef.current.click()}
              >
                <input
                  type="file"
                  accept="application/pdf"
                  ref={jdInputRef}
                  onChange={(e) => handleFileChange(e, setJdFile)}
                  hidden
                />
                <div className={`
                  w-16 h-16 rounded-full flex items-center justify-center
                  transition-all duration-300
                  ${jdFile ? 'bg-secondary/10' : 'bg-white/5 group-hover:bg-white/10'}
                `}>
                  <Briefcase className={`w-8 h-8 ${jdFile ? 'text-secondary' : 'text-slate-400'}`} />
                </div>
                <h3 className="text-xl font-medium text-white">Job Description</h3>
                {jdFile ? (
                  <span className="text-secondary font-medium text-sm break-all">{jdFile.name}</span>
                ) : (
                  <p className="text-slate-400 text-sm">Drag &amp; drop JD PDF or click to browse</p>
                )}
              </div>

              {/* Resume Dropzone */}
              <div
                className={`
                  glass-border relative rounded-2xl p-10
                  flex flex-col items-center justify-center gap-4 text-center
                  cursor-pointer backdrop-blur-xl
                  border transition-all duration-300 ease-out
                  ${isDraggingResume
                    ? 'border-primary bg-primary/10'
                    : resumeFile
                      ? 'border-secondary bg-bg-card hover:bg-bg-card-hover'
                      : 'border-white/10 bg-bg-card hover:bg-bg-card-hover hover:-translate-y-1 hover:shadow-2xl hover:shadow-black/30 hover:border-white/20'
                  }
                `}
                onDragOver={(e) => handleDragOver(e, setIsDraggingResume)}
                onDragLeave={(e) => handleDragLeave(e, setIsDraggingResume)}
                onDrop={(e) => handleDrop(e, setResumeFile, setIsDraggingResume)}
                onClick={() => resumeInputRef.current.click()}
              >
                <input
                  type="file"
                  accept="application/pdf"
                  ref={resumeInputRef}
                  onChange={(e) => handleFileChange(e, setResumeFile)}
                  hidden
                />
                <div className={`
                  w-16 h-16 rounded-full flex items-center justify-center
                  transition-all duration-300
                  ${resumeFile ? 'bg-secondary/10' : 'bg-white/5'}
                `}>
                  <FileText className={`w-8 h-8 ${resumeFile ? 'text-secondary' : 'text-slate-400'}`} />
                </div>
                <h3 className="text-xl font-medium text-white">Candidate Resume</h3>
                {resumeFile ? (
                  <span className="text-secondary font-medium text-sm break-all">{resumeFile.name}</span>
                ) : (
                  <p className="text-slate-400 text-sm">Drag &amp; drop Resume PDF or click to browse</p>
                )}
              </div>
            </div>

            {/* Error Message */}
            {error && (
              <div className="w-full text-center text-danger bg-danger/10 px-6 py-4 rounded-xl border border-danger/20">
                Error: {error}
              </div>
            )}

            {/* Analyze Button */}
            <button
              className={`
                mt-2 flex items-center gap-2 px-10 py-4 rounded-full text-lg font-semibold
                transition-all duration-300 cursor-pointer
                ${!jdFile || !resumeFile || loading
                  ? 'bg-slate-700 text-slate-400 cursor-not-allowed shadow-none'
                  : 'bg-gradient-to-r from-primary to-primary-hover text-white shadow-lg shadow-primary/30 hover:-translate-y-0.5 hover:shadow-xl hover:shadow-primary/40'
                }
              `}
              onClick={handleAnalyze}
              disabled={!jdFile || !resumeFile || loading}
            >
              {loading ? (
                <>
                  <div className="w-6 h-6 border-3 border-white/30 border-t-white rounded-full animate-spin-slow" />
                  Analyzing...
                </>
              ) : (
                <>
                  <Zap size={20} /> Evaluate Candidate
                </>
              )}
            </button>
          </>
        ) : (
          /* Results Card */
          <div className="animate-slide-up glass-border relative bg-bg-card backdrop-blur-xl border border-white/10 rounded-2xl p-10 w-full max-w-xl text-center">
            {/* Result Header */}
            <div className="mb-8">
              <h2 className="text-3xl font-bold text-white mb-2">Evaluation Result</h2>
              <p className="text-slate-400">
                Role Detected: <span className="text-white font-medium">{result.role}</span>
              </p>
            </div>

            {/* Status Badge */}
            <div className={`
              inline-flex items-center gap-2 px-6 py-3 rounded-full text-xl font-semibold mb-6
              ${result.prediction === 1
                ? 'bg-success/15 text-success border border-success/30'
                : 'bg-danger/15 text-danger border border-danger/30'
              }
            `}>
              {result.prediction === 1 ? (
                <><CheckCircle2 size={24} /> Selected</>
              ) : (
                <><XCircle size={24} /> Not Selected</>
              )}
            </div>

            {/* Confidence Meter */}
            <div className="bg-white/5 rounded-2xl p-6 mt-4">
              <div className="flex justify-between text-sm text-slate-400 mb-3">
                <span>Model Confidence Score</span>
                <span className={`font-bold ${result.prediction === 1 ? 'text-success' : 'text-danger'}`}>
                  {(result.confidence * 100).toFixed(1)}%
                </span>
              </div>
              <div className="h-2 bg-white/10 rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full meter-fill-transition ${result.prediction === 1 ? 'bg-success' : 'bg-danger'}`}
                  style={{ width: `${result.confidence * 100}%` }}
                />
              </div>
            </div>

            {/* Reset Button */}
            <button
              onClick={resetState}
              className="mt-8 px-8 py-3 rounded-full border border-white/20 text-slate-400
                         hover:text-white hover:border-white hover:bg-white/5
                         transition-all duration-200 cursor-pointer"
            >
              Analyze Another Candidate
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

export default App;
