import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../lib/api';
import { clearAuth, getToken, isStudent } from '../lib/auth';

export default function StudentOffersPage() {
  const navigate = useNavigate();
  const [offers, setOffers] = useState([]);
  const [loading, setLoading] = useState(true);

  const getOfferCtcDisplay = (offer) => {
    const ctc = offer.offeredCtc
      ?? offer.offeredCTC
      ?? offer.offered_ctc
      ?? offer.application?.job?.salary;

    if (ctc === null || ctc === undefined || Number.isNaN(Number(ctc))) {
      return 'N/A';
    }

    return Number(ctc).toLocaleString('en-IN');
  };

  const loadOffers = async () => {
    try {
      setLoading(true);
      const data = await api.getStudentOffers();
      setOffers(data);
    } catch {
      clearAuth();
      navigate('/login');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!getToken() || !isStudent()) {
      clearAuth();
      navigate('/login');
      return;
    }

    loadOffers();
  }, []);

  const respondToOffer = async (offerId, accepted) => {
    const remarks = window.prompt('Remarks (optional):', '') || '';
    try {
      await api.respondToOffer(offerId, { accepted, remarks });
      await loadOffers();
    } catch (error) {
      window.alert(error.message || 'Could not update offer response');
    }
  };

  return (
    <div className="container">
      <div className="page-header">
        <div>
          <h1>Offers</h1>
          <p>Review offers and respond from a dedicated workspace.</p>
        </div>
        <button className="btn btn-secondary" onClick={() => navigate('/student-dashboard')}>Back</button>
      </div>

      <section className="card table-card">
        {loading ? (
          <div className="inline-state">Loading offers...</div>
        ) : offers.length === 0 ? (
          <div className="inline-state">No offers available.</div>
        ) : (
          <table className="data-table">
            <thead>
              <tr>
                <th>Job</th>
                <th>Offered CTC</th>
                <th>Offered Date</th>
                <th>Status</th>
                <th>Remarks</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {offers.map((offer) => (
                <tr key={offer.offerId}>
                  <td>{offer.application?.job?.title || 'N/A'}</td>
                  <td>{getOfferCtcDisplay(offer)}</td>
                  <td>{offer.offeredDate || 'N/A'}</td>
                  <td>{offer.status || 'N/A'}</td>
                  <td>{offer.remarks || '-'}</td>
                  <td>
                    {offer.status === 'ISSUED' ? (
                      <div className="inline-actions">
                        <button className="btn" onClick={() => respondToOffer(offer.offerId, true)}>Accept</button>
                        <button className="btn btn-secondary" onClick={() => respondToOffer(offer.offerId, false)}>Reject</button>
                      </div>
                    ) : 'Completed'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>
    </div>
  );
}