import { useState, useEffect } from 'react';
import { X, ChevronRight, FileText, Layers, ArrowLeft, ExternalLink } from 'lucide-react';
// import clsx from 'clsx';

interface ElementViewerProps {
  elementId: string | null;
  modelName: string | null;
  isOpen: boolean;
  onClose: () => void;
  onNavigate?: (elementId: string, modelName: string) => void;
  onArchiOpened?: (modelName: string, elementId: string) => void;
}

interface ElementDetails {
  id: string;
  name: string;
  type: string;
  model: string;
  relationships: Array<{
    id: string;
    type: string;
    source: string;
    target: string;
    sourceName: string;
    targetName: string;
    sourceType: string;
    targetType: string;
  }>;
  documentation?: string;
}

// Helper function to format ArchiMate type names with proper spacing
const formatTypeName = (type: string): string => {
  return type
    // Add space before uppercase letters that follow lowercase letters
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    // Handle specific cases
    .replace(/([A-Z])([A-Z][a-z])/g, '$1 $2');
};

export const ElementViewer = ({ elementId, modelName, isOpen, onClose, onNavigate, onArchiOpened }: ElementViewerProps) => {
  const [elementDetails, setElementDetails] = useState<ElementDetails | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [openingArchi, setOpeningArchi] = useState(false);
  const [navigationHistory, setNavigationHistory] = useState<Array<{elementId: string, modelName: string, elementName: string}>>([]);

  useEffect(() => {
    if (isOpen && elementId && modelName) {
      fetchElementDetails();
    }
  }, [isOpen, elementId, modelName]);

  const fetchElementDetails = async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`http://localhost:3001/api/elements/${elementId}?model=${encodeURIComponent(modelName || '')}`);

      if (!response.ok) {
        throw new Error('Failed to fetch element details');
      }

      const data = await response.json();

      const details: ElementDetails = {
        id: data.id,
        name: data.name,
        type: data.type,
        model: data.model,
        relationships: data.relationships.map((rel: any) => ({
          id: rel.id,
          type: rel.type.replace('Relationship', ''),
          source: rel.source,
          target: rel.target,
          sourceName: rel.sourceName,
          targetName: rel.targetName,
          sourceType: rel.sourceType,
          targetType: rel.targetType
        })),
        documentation: data.documentation
      };

      setElementDetails(details);
    } catch (err) {
      setError('Failed to load element details');
      console.error('Error fetching element details:', err);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[80vh] overflow-hidden">
        {/* Header */}
        <div className="bg-primary-500 text-white px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            {/* Back navigation button */}
            {navigationHistory.length > 0 && (
              <button
                onClick={() => {
                  const lastElement = navigationHistory[navigationHistory.length - 1];
                  if (lastElement && onNavigate) {
                    // Remove the last element from history
                    setNavigationHistory(prev => prev.slice(0, -1));
                    // Navigate back to the previous element
                    onNavigate(lastElement.elementId, lastElement.modelName);
                  }
                }}
                className="p-2 hover:bg-primary-600 rounded-lg transition-colors"
                title="Go back to previous element"
              >
                <ArrowLeft className="w-5 h-5" />
              </button>
            )}
            <Layers className="w-6 h-6" />
            <div>
              <h2 className="text-lg font-semibold">ArchiMate Element Viewer</h2>
              <p className="text-primary-100 text-sm">Model: {modelName}</p>
              {navigationHistory.length > 0 && (
                <p className="text-primary-200 text-xs">
                  {navigationHistory.length} element{navigationHistory.length !== 1 ? 's' : ''} in history
                </p>
              )}
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-primary-600 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto max-h-[calc(80vh-100px)]">
          {loading && (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-500"></div>
              <span className="ml-3 text-gray-600">Loading element details...</span>
            </div>
          )}

          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-center gap-3">
              <div className="text-red-600">
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                </svg>
              </div>
              <div>
                <h3 className="text-red-800 font-medium">Error Loading Element</h3>
                <p className="text-red-600 text-sm">{error}</p>
              </div>
            </div>
          )}

          {elementDetails && (
            <div className="space-y-3">
              {/* Element Info */}
              <div className="bg-gray-50 rounded-lg p-3">
                <h3 className="text-base font-semibold text-gray-900 mb-2 flex items-center gap-2">
                  <FileText className="w-4 h-4 text-primary-500" />
                  Element Information
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">Name</label>
                    <p className="text-sm text-gray-900 font-medium">{elementDetails.name}</p>
                  </div>
                  <div>
                    <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">Type</label>
                    <p className="text-sm text-gray-900">{formatTypeName(elementDetails.type.replace('archimate:', ''))}</p>
                  </div>
                  <div className="md:col-span-2">
                    <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">Element ID</label>
                    <p className="text-gray-600 font-mono text-xs bg-gray-100 px-2 py-1 rounded">
                      {elementDetails.id}
                    </p>
                  </div>
                </div>
              </div>

              {/* Documentation */}
              {elementDetails.documentation && (
                <div>
                  <h3 className="text-base font-semibold text-gray-900 mb-2">Documentation</h3>
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                    <p className="text-sm text-gray-700">{elementDetails.documentation}</p>
                  </div>
                </div>
              )}

              {/* Related Elements */}
              <div>
                <h3 className="text-base font-semibold text-gray-900 mb-2">Related Elements ({elementDetails.relationships.length})</h3>
                {elementDetails.relationships.length > 0 ? (
                  <div className="space-y-1">
                    {elementDetails.relationships.map((rel, index) => {
                      // Determine which element is the "other" element (not the current one)
                      const isSourceCurrent = rel.source === elementDetails.id;
                      const relatedElement = {
                        id: isSourceCurrent ? rel.target : rel.source,
                        name: isSourceCurrent ? rel.targetName : rel.sourceName,
                        type: isSourceCurrent ? rel.targetType : rel.sourceType
                      };

                      return (
                        <div key={index} className="bg-white border border-gray-200 rounded-lg p-3 hover:bg-gray-50 transition-colors">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3 flex-1">
                              <div className="w-2 h-2 bg-primary-500 rounded-full flex-shrink-0"></div>
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 mb-1">
                                  <p className="text-sm font-medium text-gray-900 truncate">{relatedElement.name}</p>
                                  <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-md">
                                    {formatTypeName(relatedElement.type)}
                                  </span>
                                </div>
                                <div className="flex items-center gap-2 text-xs text-gray-500">
                                  <code className="bg-gray-50 px-1 py-0.5 rounded text-xs font-mono">
                                    {relatedElement.id}
                                  </code>
                                  <span>•</span>
                                  <span>
                                    {rel.type.replace('archimate:', '').replace('Relationship', '')}
                                  </span>
                                </div>
                              </div>
                            </div>
                            <button
                              onClick={() => {
                                if (onNavigate && elementDetails) {
                                  // Add current element to history
                                  setNavigationHistory(prev => [...prev, {
                                    elementId: elementDetails.id,
                                    modelName: elementDetails.model,
                                    elementName: elementDetails.name
                                  }]);
                                  onNavigate(relatedElement.id, modelName || '');
                                }
                              }}
                              className="text-gray-400 hover:text-primary-500 transition-colors ml-2 flex-shrink-0"
                              title={`Navigate to ${relatedElement.name}`}
                            >
                              <ChevronRight className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <p className="text-sm text-gray-500 italic">No related elements found for this element.</p>
                )}
              </div>

              {/* Actions */}
              <div className="border-t pt-4 flex flex-wrap gap-3">
                <button
                  type="button"
                  onClick={async (e) => {
                    e.preventDefault();
                    e.stopPropagation();

                    if (openingArchi) return;

                    setOpeningArchi(true);

                    try {
                      const response = await fetch(`http://localhost:3001/api/models/${encodeURIComponent(modelName || '')}/open-in-archi`, {
                        method: 'POST',
                        headers: {
                          'Content-Type': 'application/json',
                        },
                        body: JSON.stringify({
                          elementId: elementDetails.id
                        })
                      });

                      if (!response.ok) {
                        const errorData = await response.json();

                        if (errorData.instructions) {
                          // Fallback instructions provided by server
                          alert(`${errorData.error}\n\n${errorData.instructions}\n\nElement ID: ${errorData.elementId}`);
                        } else {
                          throw new Error(errorData.error || 'Failed to open Archi');
                        }
                      } else {
                        await response.json();

                        // Show success feedback in a subtle way
                        const successMessage = document.createElement('div');
                        successMessage.className = 'fixed bottom-4 right-4 bg-green-500 text-white px-4 py-2 rounded-lg shadow-lg z-[60]';
                        successMessage.textContent = 'Archi is opening...';
                        document.body.appendChild(successMessage);
                        setTimeout(() => {
                          if (successMessage.parentNode) {
                            successMessage.remove();
                          }
                        }, 3000);

                        // Trigger callback to add message to chat
                        if (onArchiOpened) {
                          onArchiOpened(modelName || '', elementDetails.id);
                        }
                      }
                    } catch (error) {
                      console.error('Failed to open in Archi:', error);

                      // Fallback to copying path
                      const archiPath = `/Users/chuck/Dropbox/OWLVIEW/Products/AInstein/knowledge_base/ArchiMetal_models/${modelName}/${modelName}.archimate`;
                      navigator.clipboard.writeText(archiPath).then(() => {
                        alert(`Could not open Archi automatically.\n\nFile path copied to clipboard!\n\nTo open in Archi:\n1. Open Archi application\n2. Go to File > Open\n3. Paste the path (${archiPath})\n4. Navigate to element ID: ${elementDetails.id}`);
                      }).catch(() => {
                        alert(`Could not open Archi automatically.\n\nTo open in Archi:\n1. Open Archi application\n2. Go to File > Open\n3. Navigate to: ${archiPath}\n4. Find element ID: ${elementDetails.id}`);
                      });
                    } finally {
                      setOpeningArchi(false);
                    }
                  }}
                  disabled={openingArchi}
                  className="flex items-center gap-2 px-4 py-2 bg-primary-500 text-white rounded-lg hover:bg-primary-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  title="Open the model directly in Archi application"
                >
                  {openingArchi ? (
                    <>
                      <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"></path>
                      </svg>
                      Opening...
                    </>
                  ) : (
                    <>
                      <ExternalLink className="w-4 h-4" />
                      Open in Archi
                    </>
                  )}
                </button>
                <button
                  onClick={async () => {
                    try {
                      // Download the model file
                      const downloadUrl = `http://localhost:3001/api/models/${encodeURIComponent(modelName || '')}/download`;
                      const response = await fetch(downloadUrl);

                      if (!response.ok) {
                        throw new Error(`Download failed: ${response.status} ${response.statusText}`);
                      }

                      const blob = await response.blob();
                      const url = window.URL.createObjectURL(blob);
                      const a = document.createElement('a');
                      a.href = url;
                      a.download = `${modelName}.archimate`;
                      document.body.appendChild(a);
                      a.click();
                      document.body.removeChild(a);
                      window.URL.revokeObjectURL(url);
                    } catch (error) {
                      console.error('Download failed:', error);
                      alert(`Failed to download model file: ${error instanceof Error ? error.message : String(error)}`);
                    }
                  }}
                  className="flex items-center gap-2 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
                  title="Download the .archimate model file"
                >
                  <FileText className="w-4 h-4" />
                  Download Model File
                </button>
                <button
                  onClick={() => {
                    // Copy element ID to clipboard
                    navigator.clipboard.writeText(elementDetails.id);
                    alert('Element ID copied to clipboard!');
                  }}
                  className="flex items-center gap-2 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
                  title="Copy element ID to clipboard"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3" />
                  </svg>
                  Copy Element ID
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};