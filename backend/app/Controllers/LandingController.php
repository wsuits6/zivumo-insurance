<?php
class LandingController
{
    public function plans(): array
    {
        $plans = DataStore::read('plans');
        return ['ok' => true, 'data' => $plans, 'status' => 200];
    }

    public function testimonials(): array
    {
        $items = DataStore::read('testimonials');
        return ['ok' => true, 'data' => $items, 'status' => 200];
    }

    public function faqs(): array
    {
        $items = DataStore::read('faqs');
        return ['ok' => true, 'data' => $items, 'status' => 200];
    }
}
