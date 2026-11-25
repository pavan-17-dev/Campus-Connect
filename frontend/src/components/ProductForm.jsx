import { useEffect, useRef, useState } from 'react';
import FormField from './FormField';
import categories from '../data/categories';
import { conditions } from '../data/products';
import { MAX_IMAGE_MB, MAX_IMAGES, validateProduct } from '../utils/validation';
import { formatPrice } from '../utils/format';
import './ProductForm.css';

const initial = { name: '', description: '', category: '', price: '', condition: '', images: [], location: '' };

const conditionHelp = {
  New: 'Unused, sealed or with tags',
  'Like New': 'Used briefly, no visible wear',
  Good: 'Normal signs of use, fully working',
  Fair: 'Visible wear, works as described',
};

/**
 * Listing form with drag-and-drop image upload + previews.
 * `onSubmit(values)` receives the raw File objects (for multipart upload to DRF)
 * plus data-URL previews (used by the sample-data mode).
 */
export default function ProductForm({ onSubmit, submitting = false, defaultLocation = '' }) {
  const [values, setValues] = useState({ ...initial, location: defaultLocation });
  const [previews, setPreviews] = useState([]);
  const [errors, setErrors] = useState({});
  const [dragging, setDragging] = useState(false);
  const fileInput = useRef(null);

  useEffect(() => () => previews.forEach((p) => p.objectUrl && URL.revokeObjectURL(p.objectUrl)), []); // eslint-disable-line react-hooks/exhaustive-deps

  const set = (key) => (e) => {
    setValues((v) => ({ ...v, [key]: e.target.value }));
    if (errors[key]) setErrors((er) => ({ ...er, [key]: undefined }));
  };

  const addFiles = (fileList) => {
    const files = Array.from(fileList);
    const room = MAX_IMAGES - values.images.length;
    const problems = [];
    const accepted = [];
    files.forEach((f) => {
      if (!f.type.startsWith('image/')) problems.push(`${f.name} is not an image.`);
      else if (f.size > MAX_IMAGE_MB * 1024 * 1024) problems.push(`${f.name} is larger than ${MAX_IMAGE_MB} MB.`);
      else if (accepted.length < room) accepted.push(f);
      else problems.push(`Only ${MAX_IMAGES} photos allowed.`);
    });
    if (accepted.length) {
      setValues((v) => ({ ...v, images: [...v.images, ...accepted] }));
      setPreviews((p) => [...p, ...accepted.map((f) => ({ name: f.name, objectUrl: URL.createObjectURL(f) }))]);
    }
    setErrors((er) => ({ ...er, images: problems.length ? [...new Set(problems)].join(' ') : undefined }));
  };

  const removeImage = (index) => {
    URL.revokeObjectURL(previews[index].objectUrl);
    setValues((v) => ({ ...v, images: v.images.filter((_, i) => i !== index) }));
    setPreviews((p) => p.filter((_, i) => i !== index));
  };

  const toDataUrl = (file) =>
    new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.readAsDataURL(file);
    });

  const submit = async (e) => {
    e.preventDefault();
    const errs = validateProduct(values);
    setErrors(errs);
    if (Object.keys(errs).length) {
      const first = Object.keys(errs)[0];
      document.getElementById(`pf-${first}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      return;
    }
    const dataUrls = await Promise.all(values.images.map(toDataUrl));
    onSubmit({ ...values, previews: dataUrls });
  };

  return (
    <form onSubmit={submit} noValidate className="row g-4">
      <div className="col-lg-8">
        <div className="cc-card cc-card-pad mb-4">
          <h2 className="cc-form-section"><span>1</span>Product details</h2>
          <FormField id="pf-name" label="Product Name *" placeholder="e.g. Casio fx-991ES Plus Scientific Calculator" maxLength={100} value={values.name} onChange={set('name')} error={errors.name} />
          <FormField
            id="pf-description"
            as="textarea"
            rows={5}
            label="Product Description *"
            placeholder="Describe the item: edition/model, how long you've used it, any defects, what's included…"
            maxLength={1000}
            value={values.description}
            onChange={set('description')}
            error={errors.description}
            hint={`${values.description.length}/1000 characters`}
          />
          <div className="row g-3">
            <div className="col-md-6">
              <FormField id="pf-category" as="select" label="Category *" value={values.category} onChange={set('category')} error={errors.category}>
                <option value="">Select a category</option>
                {categories.map((c) => <option key={c.slug} value={c.slug}>{c.name}</option>)}
              </FormField>
            </div>
            <div className="col-md-6">
              <FormField id="pf-price" type="number" min="1" label="Price (₹) *" icon="bi-currency-rupee" placeholder="0" value={values.price} onChange={set('price')} error={errors.price} />
            </div>
          </div>

          <label className="form-label" id="pf-condition">Product Condition *</label>
          <div className="cc-condition-grid" role="radiogroup" aria-labelledby="pf-condition">
            {conditions.map((c) => (
              <label key={c} className={`cc-condition ${values.condition === c ? 'is-active' : ''}`}>
                <input type="radio" name="condition" value={c} checked={values.condition === c} onChange={set('condition')} className="visually-hidden" />
                <strong>{c}</strong>
                <small>{conditionHelp[c]}</small>
              </label>
            ))}
          </div>
          {errors.condition && <div className="text-danger small mt-1">{errors.condition}</div>}
        </div>

        <div className="cc-card cc-card-pad mb-4">
          <h2 className="cc-form-section"><span>2</span>Product images</h2>
          <div
            id="pf-images"
            className={`cc-dropzone ${dragging ? 'is-dragging' : ''} ${errors.images ? 'is-invalid' : ''}`}
            onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
            onDragLeave={() => setDragging(false)}
            onDrop={(e) => { e.preventDefault(); setDragging(false); addFiles(e.dataTransfer.files); }}
            onClick={() => fileInput.current?.click()}
            onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && fileInput.current?.click()}
            role="button"
            tabIndex={0}
          >
            <i className="bi bi-cloud-arrow-up" />
            <strong>Drag &amp; drop photos here, or click to browse</strong>
            <small>JPG, PNG or WEBP · up to {MAX_IMAGES} photos · max {MAX_IMAGE_MB} MB each</small>
            <input ref={fileInput} type="file" accept="image/*" multiple hidden onChange={(e) => { addFiles(e.target.files); e.target.value = ''; }} />
          </div>
          {errors.images && <div className="text-danger small mt-2">{errors.images}</div>}
          {previews.length > 0 && (
            <div className="cc-preview-grid">
              {previews.map((p, i) => (
                <div key={p.objectUrl} className="cc-preview">
                  <img src={p.objectUrl} alt={`Preview ${i + 1}`} />
                  {i === 0 && <span className="cc-preview-cover">Cover</span>}
                  <button type="button" onClick={() => removeImage(i)} aria-label={`Remove ${p.name}`}><i className="bi bi-x-lg" /></button>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="cc-card cc-card-pad">
          <h2 className="cc-form-section"><span>3</span>Pickup location</h2>
          <FormField id="pf-location" label="Campus Location *" icon="bi-geo-alt" placeholder="e.g. Main Library entrance, CSE Block" value={values.location} onChange={set('location')} error={errors.location} hint="Pick a public, easy-to-find spot on campus." />
        </div>
      </div>

      <div className="col-lg-4">
        <div className="cc-sell-aside">
          <div className="cc-card cc-card-pad mb-3">
            <h3 className="h6 mb-3">Listing preview</h3>
            <div className="cc-mini-preview">
              {previews[0] ? <img src={previews[0].objectUrl} alt="" /> : <div className="cc-mini-placeholder"><i className="bi bi-image" /></div>}
              <div>
                <strong>{values.name || 'Your product name'}</strong>
                <span>{values.price ? formatPrice(values.price) : '₹ —'}</span>
                <small>{categories.find((c) => c.slug === values.category)?.name || 'Category'} · {values.condition || 'Condition'}</small>
              </div>
            </div>
            <button type="submit" className="btn btn-primary btn-lg w-100 mt-3" disabled={submitting}>
              {submitting ? <><span className="spinner-border spinner-border-sm me-2" />Publishing…</> : <><i className="bi bi-check2-circle me-2" />Submit Listing</>}
            </button>
          </div>
          <div className="cc-card cc-card-pad cc-tips">
            <h3 className="h6"><i className="bi bi-lightbulb text-warning me-2" />Tips to sell faster</h3>
            <ul>
              <li>Use bright, clear photos from multiple angles.</li>
              <li>Mention edition, model or size in the title.</li>
              <li>Be honest about wear and defects.</li>
              <li>Price around 40–60% of the original for used items.</li>
            </ul>
          </div>
        </div>
      </div>
    </form>
  );
}
