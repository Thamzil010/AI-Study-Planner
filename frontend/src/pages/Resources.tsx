import { useState, useEffect } from 'react';
import { api } from '../services/api';
import { Video, FileText, ExternalLink, BookOpen } from 'lucide-react';

const Resources = () => {
  const [resources, setResources] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchResources = async () => {
      try {
        const res = await api.get('/resources');
        setResources(res.data);
      } catch (error) {
        console.error('Failed to fetch resources', error);
      } finally {
        setLoading(false);
      }
    };

    fetchResources();
  }, []);

  if (loading) return <div>Loading resources...</div>;

  return (
    <div className="space-y-6">
      <h2 className="text-3xl font-bold text-gray-800">Smart Resource Finder</h2>
      
      {resources.length === 0 ? (
        <div className="bg-white p-8 rounded-lg shadow-sm border border-gray-200 text-center">
          <BookOpen className="mx-auto h-12 w-12 text-gray-400 mb-4" />
          <h3 className="text-lg font-medium text-gray-900">No resources found</h3>
          <p className="mt-1 text-gray-500">Add some subjects to get AI-recommended learning materials.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {resources.map((resource) => (
            <div key={resource.id} className="bg-white rounded-lg shadow-sm border border-gray-200 p-5 hover:shadow-md transition-shadow">
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-2">
                  {resource.type === 'YOUTUBE' ? (
                    <Video className="text-red-500" size={24} />
                  ) : resource.type === 'PDF' ? (
                    <FileText className="text-blue-500" size={24} />
                  ) : (
                    <BookOpen className="text-gray-500" size={24} />
                  )}
                  <span className="text-xs font-semibold px-2 py-1 bg-gray-100 rounded text-gray-600">
                    {resource.type}
                  </span>
                </div>
              </div>
              
              <h3 className="text-lg font-bold text-gray-900 mb-1">{resource.title}</h3>
              <p className="text-sm text-gray-500 mb-4">For subject: <span className="font-medium text-blue-600">{resource.subject.name}</span></p>
              
              <a 
                href={resource.url} 
                target="_blank" 
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-sm font-medium text-blue-600 hover:text-blue-800"
              >
                View Resource <ExternalLink size={14} />
              </a>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default Resources;
