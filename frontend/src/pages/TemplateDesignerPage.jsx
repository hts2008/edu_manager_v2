import { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { templatesService } from '../services/api';
import { useToast } from '../components/ui/Toast';

// VI: Template Designer với Fabric.js canvas
export default function TemplateDesignerPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const canvasRef = useRef(null);
  const fabricRef = useRef(null);
  
  const [template, setTemplate] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectedObject, setSelectedObject] = useState(null);
  const [zoom, setZoom] = useState(100);
  const [showGrid, setShowGrid] = useState(true);
  const [saving, setSaving] = useState(false);
  const toast = useToast();

  // Paper size presets in mm
  const paperSizes = {
    a4: { width: 210, height: 297, label: 'A4' },
    a5: { width: 148, height: 210, label: 'A5' },
    letter: { width: 216, height: 279, label: 'Letter' },
    thermal_80mm: { width: 80, height: 200, label: 'Thermal 80mm' },
  };

  // Convert mm to pixels (96 DPI)
  const mmToPx = (mm) => Math.round(mm * 3.7795275591);

  // Load template data
  useEffect(() => {
    if (id) {
      loadTemplate();
    } else {
      setLoading(false);
    }
  }, [id]);

  // Initialize Fabric.js canvas
  useEffect(() => {
    if (!loading && !fabricRef.current) {
      initCanvas();
    }
    return () => {
      if (fabricRef.current) {
        fabricRef.current.dispose();
      }
    };
  }, [loading]);

  const loadTemplate = async () => {
    const response = await templatesService.getById(id);
    if (response.success) {
      setTemplate(response.data.template);
    }
    setLoading(false);
  };

  const initCanvas = async () => {
    // Dynamic import for Fabric.js (ESM)
    const fabric = await import('fabric');
    const FabricCanvas = fabric.Canvas || fabric.default?.Canvas;
    
    if (!FabricCanvas) {
      console.error('Fabric.js Canvas not found');
      return;
    }

    const paperSize = paperSizes[template?.paper_size || 'a4'];
    const isLandscape = template?.orientation === 'landscape';
    const width = mmToPx(isLandscape ? paperSize.height : paperSize.width);
    const height = mmToPx(isLandscape ? paperSize.width : paperSize.height);

    const canvas = new FabricCanvas(canvasRef.current, {
      width: width,
      height: height,
      backgroundColor: '#ffffff',
      selection: true,
      preserveObjectStacking: true,
    });

    fabricRef.current = canvas;

    // Selection events
    canvas.on('selection:created', (e) => setSelectedObject(e.selected?.[0]));
    canvas.on('selection:updated', (e) => setSelectedObject(e.selected?.[0]));
    canvas.on('selection:cleared', () => setSelectedObject(null));

    // Load existing template config
    if (template?.json_config) {
      try {
        const config = JSON.parse(template.json_config);
        if (config.objects) {
          canvas.loadFromJSON(config, () => canvas.renderAll());
        }
      } catch (e) {
        console.error('Error loading template config:', e);
      }
    }

    // Draw grid if enabled
    if (showGrid) {
      drawGrid(canvas, width, height);
    }

    // Keyboard handler for Delete key
    const handleKeyDown = (e) => {
      if (e.key === 'Delete' || e.key === 'Backspace') {
        const activeObj = canvas.getActiveObject();
        if (activeObj && !activeObj.isEditing) {
          canvas.remove(activeObj);
          canvas.renderAll();
          setSelectedObject(null);
        }
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  };

  const drawGrid = (canvas, width, height) => {
    const gridSize = 20;
    const fabric = window.fabric || fabricRef.current?.fabric;
    
    for (let i = 0; i < width / gridSize; i++) {
      const line = new fabric.Line([i * gridSize, 0, i * gridSize, height], {
        stroke: '#e5e7eb',
        selectable: false,
        evented: false,
        excludeFromExport: true,
      });
      canvas.add(line);
      canvas.sendToBack(line);
    }
    
    for (let i = 0; i < height / gridSize; i++) {
      const line = new fabric.Line([0, i * gridSize, width, i * gridSize], {
        stroke: '#e5e7eb',
        selectable: false,
        evented: false,
        excludeFromExport: true,
      });
      canvas.add(line);
      canvas.sendToBack(line);
    }
  };

  // Add text element
  const addText = async () => {
    const fabric = await import('fabric');
    const Textbox = fabric.Textbox || fabric.default?.Textbox;
    
    const text = new Textbox('Nhập text...', {
      left: 50,
      top: 50,
      width: 200,
      fontSize: 16,
      fontFamily: 'Arial',
      fill: '#333333',
    });
    
    fabricRef.current?.add(text);
    fabricRef.current?.setActiveObject(text);
    fabricRef.current?.renderAll();
  };

  // Add heading
  const addHeading = async () => {
    const fabric = await import('fabric');
    const Textbox = fabric.Textbox || fabric.default?.Textbox;
    
    const text = new Textbox('TIÊU ĐỀ', {
      left: 50,
      top: 50,
      width: 300,
      fontSize: 24,
      fontFamily: 'Arial',
      fontWeight: 'bold',
      fill: '#1f2937',
      textAlign: 'center',
    });
    
    fabricRef.current?.add(text);
    fabricRef.current?.setActiveObject(text);
    fabricRef.current?.renderAll();
  };

  // Add binding field (dynamic data)
  const addBindingField = async (fieldName, label) => {
    const fabric = await import('fabric');
    const Textbox = fabric.Textbox || fabric.default?.Textbox;
    
    const text = new Textbox(`{{${fieldName}}}`, {
      left: 50,
      top: 50,
      width: 200,
      fontSize: 14,
      fontFamily: 'Arial',
      fill: '#2563eb',
      backgroundColor: '#dbeafe',
      customType: 'binding',
      bindingField: fieldName,
      bindingLabel: label,
    });
    
    fabricRef.current?.add(text);
    fabricRef.current?.setActiveObject(text);
    fabricRef.current?.renderAll();
  };

  // Add rectangle
  const addRectangle = async () => {
    const fabric = await import('fabric');
    const Rect = fabric.Rect || fabric.default?.Rect;
    
    const rect = new Rect({
      left: 50,
      top: 50,
      width: 200,
      height: 100,
      fill: 'transparent',
      stroke: '#333333',
      strokeWidth: 1,
    });
    
    fabricRef.current?.add(rect);
    fabricRef.current?.setActiveObject(rect);
    fabricRef.current?.renderAll();
  };

  // Add line
  const addLine = async () => {
    const fabric = await import('fabric');
    const Line = fabric.Line || fabric.default?.Line;
    
    const line = new Line([50, 50, 250, 50], {
      stroke: '#333333',
      strokeWidth: 1,
    });
    
    fabricRef.current?.add(line);
    fabricRef.current?.setActiveObject(line);
    fabricRef.current?.renderAll();
  };

  // Delete selected
  const deleteSelected = () => {
    const activeObject = fabricRef.current?.getActiveObject();
    if (activeObject) {
      fabricRef.current?.remove(activeObject);
      fabricRef.current?.renderAll();
      setSelectedObject(null);
    }
  };

  // Save template
  const handleSave = async () => {
    if (!fabricRef.current || !template) return;
    
    setSaving(true);
    
    // Get canvas JSON (exclude grid lines)
    const json = fabricRef.current.toJSON(['customType', 'bindingField', 'bindingLabel']);
    json.objects = json.objects.filter(obj => !obj.excludeFromExport);
    
    const response = await templatesService.update(template.id, {
      ...template,
      json_config: JSON.stringify(json),
    });
    
    setSaving(false);
    
    if (response.success) {
      toast.success('Đã lưu mẫu thành công!');
    } else {
      toast.error('Không thể lưu mẫu. Vui lòng thử lại.');
    }
  };

  // Toggle bold
  const toggleBold = () => {
    if (!selectedObject || selectedObject.type !== 'textbox') return;
    const newWeight = selectedObject.fontWeight === 'bold' ? 'normal' : 'bold';
    selectedObject.set('fontWeight', newWeight);
    fabricRef.current?.renderAll();
    setSelectedObject({ ...selectedObject });
  };

  // Toggle italic
  const toggleItalic = () => {
    if (!selectedObject || selectedObject.type !== 'textbox') return;
    const newStyle = selectedObject.fontStyle === 'italic' ? 'normal' : 'italic';
    selectedObject.set('fontStyle', newStyle);
    fabricRef.current?.renderAll();
    setSelectedObject({ ...selectedObject });
  };

  // Set text alignment
  const setTextAlign = (align) => {
    if (!selectedObject || selectedObject.type !== 'textbox') return;
    selectedObject.set('textAlign', align);
    fabricRef.current?.renderAll();
    setSelectedObject({ ...selectedObject });
  };

  // Binding fields available
  const bindingFields = [
    { field: 'receipt_id', label: 'Mã phiếu' },
    { field: 'receipt_date', label: 'Ngày thu' },
    { field: 'student_name', label: 'Tên học viên' },
    { field: 'class_name', label: 'Tên lớp' },
    { field: 'total_amount', label: 'Số tiền' },
    { field: 'amount_in_words', label: 'Số tiền bằng chữ' },
    { field: 'month', label: 'Tháng' },
    { field: 'payment_method', label: 'Phương thức' },
    { field: 'parent_name', label: 'Tên phụ huynh' },
    { field: 'center_name', label: 'Tên trung tâm' },
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="spinner w-8 h-8"></div>
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col bg-gray-100">
      {/* Toolbar */}
      <div className="bg-white border-b px-4 py-2 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button 
            onClick={() => navigate('/templates')}
            className="p-2 hover:bg-gray-100 rounded-lg"
          >
            ← Quay lại
          </button>
          <h1 className="font-semibold text-gray-900">
            {template?.template_name || 'Tạo mẫu mới'}
          </h1>
          <span className={`px-2 py-0.5 rounded text-xs font-medium ${
            template?.type === 'receipt' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
          }`}>
            {template?.type === 'receipt' ? 'Phiếu thu' : 'Phiếu chi'}
          </span>
        </div>
        
        <div className="flex items-center gap-2">
          <button onClick={handleSave} disabled={saving} className="btn-primary">
            {saving ? 'Đang lưu...' : '💾 Lưu mẫu'}
          </button>
        </div>
      </div>

      {/* Main Area */}
      <div className="flex flex-1 overflow-hidden">
        {/* Left Toolbar */}
        <div className="w-64 bg-white border-r p-4 overflow-y-auto">
          <h3 className="font-semibold text-gray-900 mb-3">📝 Thêm phần tử</h3>
          
          <div className="space-y-2 mb-6">
            <button onClick={addHeading} className="w-full p-3 text-left bg-gray-50 hover:bg-gray-100 rounded-lg transition-colors">
              <span className="text-lg mr-2">📌</span> Tiêu đề
            </button>
            <button onClick={addText} className="w-full p-3 text-left bg-gray-50 hover:bg-gray-100 rounded-lg transition-colors">
              <span className="text-lg mr-2">📝</span> Text thường
            </button>
            <button onClick={addRectangle} className="w-full p-3 text-left bg-gray-50 hover:bg-gray-100 rounded-lg transition-colors">
              <span className="text-lg mr-2">⬜</span> Hình chữ nhật
            </button>
            <button onClick={addLine} className="w-full p-3 text-left bg-gray-50 hover:bg-gray-100 rounded-lg transition-colors">
              <span className="text-lg mr-2">➖</span> Đường kẻ
            </button>
          </div>

          <h3 className="font-semibold text-gray-900 mb-3">🔗 Trường dữ liệu</h3>
          <div className="space-y-1">
            {bindingFields.map(bf => (
              <button 
                key={bf.field}
                onClick={() => addBindingField(bf.field, bf.label)}
                className="w-full p-2 text-left text-sm bg-blue-50 hover:bg-blue-100 rounded-lg transition-colors text-blue-700"
              >
                {bf.label}
              </button>
            ))}
          </div>
        </div>

        {/* Canvas Area */}
        <div className="flex-1 p-8 overflow-auto flex items-start justify-center bg-gray-200">
          <div className="shadow-2xl">
            <canvas ref={canvasRef} />
          </div>
        </div>

        {/* Right Panel - Properties */}
        <div className="w-64 bg-white border-l p-4 overflow-y-auto">
          <h3 className="font-semibold text-gray-900 mb-3">⚙️ Thuộc tính</h3>
          
          {selectedObject ? (
            <div className="space-y-4">
              <div>
                <label className="block text-sm text-gray-600 mb-1">Vị trí X</label>
                <input 
                  type="number" 
                  value={Math.round(selectedObject.left || 0)}
                  onChange={(e) => {
                    selectedObject.set('left', parseInt(e.target.value));
                    fabricRef.current?.renderAll();
                  }}
                  className="input"
                />
              </div>
              <div>
                <label className="block text-sm text-gray-600 mb-1">Vị trí Y</label>
                <input 
                  type="number" 
                  value={Math.round(selectedObject.top || 0)}
                  onChange={(e) => {
                    selectedObject.set('top', parseInt(e.target.value));
                    fabricRef.current?.renderAll();
                  }}
                  className="input"
                />
              </div>
              {selectedObject.type === 'textbox' && (
                <>
                  <div>
                    <label className="block text-sm text-gray-600 mb-1">Cỡ chữ</label>
                    <input 
                      type="number" 
                      value={selectedObject.fontSize || 14}
                      onChange={(e) => {
                        selectedObject.set('fontSize', parseInt(e.target.value));
                        fabricRef.current?.renderAll();
                      }}
                      className="input"
                    />
                  </div>
                  <div>
                    <label className="block text-sm text-gray-600 mb-1">Màu chữ</label>
                    <input 
                      type="color" 
                      value={selectedObject.fill || '#333333'}
                      onChange={(e) => {
                        selectedObject.set('fill', e.target.value);
                        fabricRef.current?.renderAll();
                      }}
                      className="w-full h-10 rounded cursor-pointer"
                    />
                  </div>
                  <div>
                    <label className="block text-sm text-gray-600 mb-2">Kiểu chữ</label>
                    <div className="flex gap-2">
                      <button
                        onClick={toggleBold}
                        className={`flex-1 p-2 rounded-lg font-bold ${
                          selectedObject.fontWeight === 'bold' 
                            ? 'bg-primary-100 text-primary-700 border border-primary-300' 
                            : 'bg-gray-100 hover:bg-gray-200'
                        }`}
                      >
                        B
                      </button>
                      <button
                        onClick={toggleItalic}
                        className={`flex-1 p-2 rounded-lg italic ${
                          selectedObject.fontStyle === 'italic' 
                            ? 'bg-primary-100 text-primary-700 border border-primary-300' 
                            : 'bg-gray-100 hover:bg-gray-200'
                        }`}
                      >
                        I
                      </button>
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm text-gray-600 mb-2">Căn lề</label>
                    <div className="flex gap-1">
                      {['left', 'center', 'right'].map(align => (
                        <button
                          key={align}
                          onClick={() => setTextAlign(align)}
                          className={`flex-1 p-2 rounded-lg ${
                            selectedObject.textAlign === align 
                              ? 'bg-primary-100 text-primary-700 border border-primary-300' 
                              : 'bg-gray-100 hover:bg-gray-200'
                          }`}
                        >
                          {align === 'left' ? '←' : align === 'center' ? '↔' : '→'}
                        </button>
                      ))}
                    </div>
                  </div>
                </>
              )}
              <button onClick={deleteSelected} className="w-full btn-secondary text-red-600">
                🗑️ Xóa phần tử
              </button>
            </div>
          ) : (
            <p className="text-sm text-gray-400 text-center py-8">
              Chọn một phần tử để chỉnh sửa thuộc tính
            </p>
          )}

          <hr className="my-4" />

          <h3 className="font-semibold text-gray-900 mb-3">📐 Canvas</h3>
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">Khổ giấy</span>
              <span className="text-sm font-medium">
                {paperSizes[template?.paper_size || 'a4']?.label}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">Hướng</span>
              <span className="text-sm font-medium">
                {template?.orientation === 'landscape' ? 'Ngang' : 'Dọc'}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
